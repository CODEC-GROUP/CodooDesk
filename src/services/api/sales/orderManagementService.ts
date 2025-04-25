import { ipcMain } from 'electron';
import { Op, or } from 'sequelize';
import Sales, { SalesAttributes } from '../../../models/Sales.js';
import Order from '../../../models/Order.js';
import { sequelize } from '../../database/index.js';
import Product from '../../../models/Product.js';
import OhadaCode from '../../../models/OhadaCode.js';
import Income from '../../../models/Income.js';
import Customer from '../../../models/Customer.js';
import Receipt from '../../../models/Receipt.js';
import Invoice from '../../../models/Invoice.js';
import InventoryItem from '../../../models/InventoryItem.js'; // Import InventoryItem model

const IPC_CHANNELS = {
  CREATE_SALE_WITH_ORDERS: 'order-management:create-sale',
  GET_SALES_WITH_ORDERS: 'order-management:get-sales',
  GET_SALE_DETAILS: 'order-management:get-sale-details',
  UPDATE_SALE_STATUS: 'order-management:update-sale-status',
  FORMAT_RECEIPT_DATA: 'order-management:format-receipt',
};

interface OrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  inventoryItemId?: string | null; // Renamed from inventoryId for clarity - this is the InventoryItem record ID
  warehouseId?: string | null; // For backward compatibility - this is the Inventory ID
}

interface OrderTotals {
  total: number;
  profit: number;
}

export function registerOrderManagementHandlers() {
  // Create a new sale with orders
  ipcMain.handle(IPC_CHANNELS.CREATE_SALE_WITH_ORDERS, async (event, {
    orderItems,
    customer,
    paymentMethod,
    paymentStatus,
    deliveryStatus,
    amountPaid,
    changeGiven,
    shopId,
    discount = 0,
    deliveryFee = 0,
    salesPersonId
  }) => {
    const t = await sequelize.transaction();

    try {
      // Calculate total and profit
      const orderTotals = await orderItems.reduce(async (promise: Promise<OrderTotals>, item: OrderItem) => {
        const acc = await promise;
        let itemProfit = 0;

        // If product exists in system, calculate actual profit
        if (item.productId) {
          const product = await Product.findByPk(item.productId);
          if (product) {
            itemProfit = item.quantity * (item.sellingPrice - product.purchasePrice);
          }
        }

        const itemTotal = item.quantity * item.sellingPrice;
        return {
          total: acc.total + itemTotal,
          profit: acc.profit + itemProfit
        };
      }, Promise.resolve({ total: 0, profit: 0 }));

      // Calculate final amounts
      const netAmount = orderTotals.total - (discount || 0) + (deliveryFee || 0);

      // Create sale first
      const sale = await Sales.create({
        shopId,
        status: paymentStatus === 'paid' ? 'completed' : 'pending',
        customer_id: customer?.id || null,
        deliveryStatus,
        netAmount,
        amountPaid: paymentStatus === 'paid' ? amountPaid : 0,
        changeGiven: paymentStatus === 'paid' ? changeGiven : 0,
        deliveryFee: deliveryFee || 0,
        discount: discount || 0,
        profit: orderTotals.profit,
        paymentMethod,
        salesPersonId
      }, { transaction: t });

      // Create orders and update product quantities
      const orderPromises = orderItems.map(async (item: OrderItem) => {
        // Create order with product name regardless of whether product exists
        const order = await Order.create({
          saleId: sale.id,
          product_id: item.productId as string | undefined,
          inventory_item_id: item.inventoryItemId as string | undefined,
          productName: item.productName,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          paymentStatus: paymentStatus || 'pending',
        }, { transaction: t });

        // Only update quantity if product exists in system
        if (item.productId) {
          const product = await Product.findByPk(item.productId, { transaction: t });
          if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
          }

          if (product.quantity < item.quantity) {
            throw new Error(`Insufficient stock for product: ${product.name}`);
          }

          // Update product quantity
          await product.decrement('quantity', {
            by: item.quantity,
            transaction: t
          });

          // If an inventory item ID is provided, update that specific inventory item's quantity
          if (item.inventoryItemId) {
            console.log(`Processing inventory update for product ${item.productId}, inventory item ID: ${item.inventoryItemId}`);
            
            // Find the inventory item - use the inventoryItemId directly if available
            const inventoryItemQuery = {
              where: item.warehouseId ? 
                // If we have a warehouseId (inventory_id), use that with product_id
                {
                  inventory_id: item.warehouseId,
                  product_id: item.productId
                } :
                // Otherwise, try to find by the inventory item's own ID
                {
                  id: item.inventoryItemId,
                  product_id: item.productId
                },
              transaction: t
            };
            
            console.log(`Inventory item query:`, inventoryItemQuery);
            const inventoryItem = await InventoryItem.findOne(inventoryItemQuery);

            if (inventoryItem) {
              // Check if there's enough quantity in this specific inventory
              if (inventoryItem.quantity_left < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.name} in the selected inventory`);
              }

              // Update inventory item quantity
              await inventoryItem.decrement('quantity_left', {
                by: item.quantity,
                transaction: t
              });

              // Update inventory item status based on new quantity
              const updatedInventoryItem = await InventoryItem.findOne(inventoryItemQuery);

              if (updatedInventoryItem) {
                const newStatus = updatedInventoryItem.quantity_left <= 0 ? 'out_of_stock' :
                                updatedInventoryItem.quantity_left <= (updatedInventoryItem.reorder_point ?? 10) ? 'low_stock' :
                                'in_stock';
                
                await updatedInventoryItem.update({ 
                  status: newStatus
                }, { transaction: t });
              }
            }
          }

          // Update product status based on new quantity
          const updatedProduct = await Product.findByPk(item.productId, { transaction: t });
          if (updatedProduct) {
            const newStatus = updatedProduct.quantity <= 0 ? 'out_of_stock' :
                            updatedProduct.quantity <= (updatedProduct.reorderPoint ?? 10) ? 'low_stock' :
                            updatedProduct.quantity <= (updatedProduct.reorderPoint ?? 10) * 2 ? 'medium_stock' :
                            'high_stock';
            
            await updatedProduct.update({ 
              status: newStatus as 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock'
            }, { transaction: t });
          }
        }

        return order;
      });

      await Promise.all(orderPromises);

      // Record the sale in income
      const ohadaCode = await OhadaCode.findOne({
        where: { code: '701' }, // Sales revenue code
        transaction: t
      });

      if (!ohadaCode) {
        throw new Error('Sales OHADA code not found');
      }

      // Create income record for all sales, regardless of payment status
      await Income.create({
        date: new Date(),
        description: `Sales revenue - Order #${sale.id}`,
        amount: netAmount,
        paymentMethod,
        ohadaCodeId: ohadaCode.id,
        shopId,
        saleId: sale.id
      }, { transaction: t });

      // Generate appropriate document based on payment status
      let documentData;
      if (paymentStatus === 'paid') {
        const receipt = await Receipt.create({
          sale_id: sale.id,
          amount: netAmount,
          status: 'paid'
        }, { transaction: t });

        // Update sale with receipt reference
        await sale.update({
          receipt_id: receipt.id
        }, { transaction: t });

        documentData = {
          type: 'receipt',
          id: receipt.id,
          saleId: sale.id,
          date: new Date(),
          items: orderItems.map((item: OrderItem) => ({
            name: item.productName, 
            quantity: item.quantity,
            sellingPrice: item.sellingPrice
          })),
          customerName: customer?.name || 'Walk-in Customer',
          customerPhone: customer?.phone || '',
          subtotal: orderTotals.total,
          discount: discount || 0,
          deliveryFee: deliveryFee || 0,
          total: netAmount,
          amountPaid,
          change: changeGiven,
          paymentMethod,
          salesPersonId
        };
      } else {
        const invoice = await Invoice.create({
          sale_id: sale.id,
          amount: netAmount,
          status: 'unpaid'
        }, { transaction: t });

        // Update sale with invoice reference
        await sale.update({
          invoice_id: invoice.id
        }, { transaction: t });

        documentData = {
          type: 'invoice',
          id: invoice.id,
          saleId: sale.id,
          date: new Date(),
          items: orderItems.map((item: OrderItem) => ({
            name: item.productName, 
            quantity: item.quantity,
            sellingPrice: item.sellingPrice
          })),
          customerName: customer?.name || 'Walk-in Customer',
          customerPhone: customer?.phone || '',
          subtotal: orderTotals.total,
          discount: discount || 0,
          deliveryFee: deliveryFee || 0,
          total: netAmount,
          paymentMethod,
          salesPersonId
        };
      }

      // Fetch the complete sale with all related data
      const completeSale = await Sales.findOne({
        where: { id: sale.id },
        include: [
          {
            model: Order,
            as: 'orders',
            include: [
              {
                model: Product,
                as: 'product'
              }
            ]
          }
        ],
        transaction: t
      });

      if (!completeSale) {
        throw new Error('Failed to fetch sale data');
      }

      await t.commit();

      return {
        success: true,
        sale: completeSale.get({ plain: true }),
        document: documentData
      };
    } catch (error: unknown) {
      await t.rollback();
      console.error('Error creating sale:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create sale',
        error 
      };
    }
  });

  // Get sales with orders based on user role and shop access
  ipcMain.handle(IPC_CHANNELS.GET_SALES_WITH_ORDERS, async (event, { 
    user,
    shopId,
    shopIds,
    page = 1,
    limit = 10,
    status,
    search,
    startDate,
    endDate
  }) => {
    try {
      // Validate shop ID requirement
      if (!shopId && (!shopIds || !shopIds.length)) {
        return {
          success: false,
          message: 'Shop ID or shop IDs are required',
          sales: [],
          total: 0,
          currentPage: page,
          pages: 0
        };
      }

      const whereClause: any = {};
      
      // Handle shop IDs based on input
      if (shopId) {
        whereClause.shopId = shopId;
      } else if (shopIds && shopIds.length > 0) {
        whereClause.shopId = {
          [Op.in]: shopIds
        };
      }

      // Add status filter if provided
      if (status && status !== 'all') {
        whereClause.deliveryStatus = status;
      }

      // Add date range filter if provided
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [
            new Date(startDate),
            new Date(new Date(endDate).setHours(23, 59, 59, 999)) // End of the selected day
          ]
        };
      }

      // Add search functionality if provided
      if (search) {
        whereClause[Op.or] = [
          { id: { [Op.like]: `%${search}%` } },
          { '$customer.first_name$': { [Op.like]: `%${search}%` } },
          { '$customer.last_name$': { [Op.like]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { rows: sales, count } = await Sales.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'first_name', 'last_name', 'phone_number']
          },
          {
            model: Order,
            as: 'orders',
            attributes: ['id', 'quantity', 'productName', 'sellingPrice'],
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'sellingPrice']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      // Sanitize the response
      const sanitizedSales = sales.map(sale => {
        const plainSale = sale.get({ plain: true });
        return {
          id: plainSale.id,
          createdAt: plainSale.createdAt,
          updatedAt: plainSale.updatedAt,
          netAmount: plainSale.netAmount,
          deliveryStatus: plainSale.deliveryStatus,
          paymentStatus: plainSale.status,
          paymentMethod: plainSale.paymentMethod,
          customer: plainSale.customer ? {
            id: plainSale.customer.id,
            name: `${plainSale.customer.first_name} ${plainSale.customer.last_name}`,
            phone: plainSale.customer.phone_number
          } : null,
          orders: plainSale.orders?.map((order: any) => ({
            id: order.id,
            quantity: order.quantity,
            product: order.product ? {
              id: order.product.id,
              name: order.product.name,
              price: order.product.sellingPrice
            } : {
              name: order.productName,
              price: order.sellingPrice
            }
          })) || []
        };
      });

      return {
        success: true,
        sales: sanitizedSales,
        total: count,
        currentPage: page,
        pages: Math.ceil(count / limit)
      };

    } catch (error: unknown) {
      console.error('Error fetching sales:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch sales',
        sales: [],
        total: 0,
        currentPage: page,
        pages: 0
      };
    }
  });

  // Get sale details with formatted receipt data
  ipcMain.handle(IPC_CHANNELS.GET_SALE_DETAILS, async (event, { id }) => {
    try {
      const sale = await Sales.findOne({
        where: { id: id },
        include: [
          {
            model: Order,
            as: 'orders',
            include: [{
              model: Product,
              as: 'product'
            }]
          },
          {
            model: Customer,
            as: 'customer'
          },
          {
            model: Receipt,
            as: 'receipt'
          },
          {
            model: Invoice,
            as: 'invoice'
          }
        ]
      });

      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }

      const plainSale = sale.get({ plain: true });
      
      // Format receipt data
      const receiptData = {
        saleId: plainSale.id,
        receiptId: plainSale.receipt_id || plainSale.invoice_id,
        customerName: plainSale.customer ? 
          `${plainSale.customer.first_name} ${plainSale.customer.last_name}` : 
          'Walk-in Customer',
        customerPhone: plainSale.customer?.phone_number || '',
        items: plainSale.orders?.map((order: any) => ({
          name: order.product ? order.product.name : order.productName,
          quantity: order.quantity,
          sellingPrice: order.sellingPrice
        })) || [],
        subtotal: plainSale.netAmount + plainSale.discount - plainSale.deliveryFee,
        discount: plainSale.discount,
        deliveryFee: plainSale.deliveryFee,
        total: plainSale.netAmount,
        amountPaid: plainSale.amountPaid,
        change: plainSale.changeGiven,
        date: plainSale.createdAt,
        paymentMethod: plainSale.paymentMethod,
        salesPersonId: plainSale.salesPersonId
      };

      return {
        success: true,
        sale: plainSale,
        data: { receiptData }
      };
    } catch (error) {
      console.error('Error in get-sale-details:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch sale details'
      };
    }
  });

  // Update sale status
  ipcMain.handle(IPC_CHANNELS.UPDATE_SALE_STATUS, async (event, { saleId, status, type }) => {
    try {
      const sale = await Sales.findByPk(saleId, {
        include: [
          {
            model: Order,
            as: 'orders',
            include: ['product']
          },
          'customer',
          'receipt',
          'invoice'
        ]
      });

      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }

      // Update the appropriate status
      if (type === 'payment') {
        await sale.update({ status });
      } else if (type === 'delivery') {
        await sale.update({ deliveryStatus: status });
      }

      const plainSale = sale.get({ plain: true });
      
      // Format receipt data
      const receiptData = {
        saleId: plainSale.id,
        receiptId: plainSale.receipt_id || plainSale.invoice_id,
        customerName: plainSale.customer ? 
          `${plainSale.customer.first_name} ${plainSale.customer.last_name}` : 
          'Walk-in Customer',
        customerPhone: plainSale.customer?.phone_number || '',
        items: plainSale.orders?.map((order: any) => ({
          name: order.product ? order.product.name : order.productName,
          quantity: order.quantity,
          sellingPrice: order.sellingPrice
        })) || [],
        subtotal: plainSale.netAmount + plainSale.discount - plainSale.deliveryFee,
        discount: plainSale.discount,
        deliveryFee: plainSale.deliveryFee,
        total: plainSale.netAmount,
        amountPaid: plainSale.amountPaid,
        change: plainSale.changeGiven,
        date: plainSale.createdAt,
        paymentMethod: plainSale.paymentMethod,
        salesPersonId: plainSale.salesPersonId
      };

      return {
        success: true,
        sale: plainSale,
        data: { receiptData }
      };
    } catch (error) {
      console.error('Error updating sale status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update sale status'
      };
    }
  });
}

export { IPC_CHANNELS };