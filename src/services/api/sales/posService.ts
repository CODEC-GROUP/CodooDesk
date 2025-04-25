import { ipcMain } from 'electron';
import { Op } from 'sequelize';
import Sales, { SalesAttributes } from '../../../models/Sales.js';
import Order, { OrderAttributes } from '../../../models/Order.js';
import Product from '../../../models/Product.js';
import Income from '../../../models/Income.js';
import Receipt from '../../../models/Receipt.js';
import { sequelize } from '../../database/index.js';
import OhadaCode from '../../../models/OhadaCode.js';
import InventoryItem from '../../../models/InventoryItem.js';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  actualPrice: number;
  inventoryItemId?: string;
}

interface POSSaleRequest {
  shopId: string;
  customer?: {
    id: string | null;
    name: string;
    phone: string;
  };
  cartItems: {
    id: string;
    name: string;
    quantity: number;
    actualPrice: number;
    inventoryItemId?: string | null;
    warehouseId?: string | null;
  }[];
  paymentMethod: string;
  amountPaid: number;
  changeGiven: number;
  subtotal: number;
  discount?: number;
  salesPersonId: string;
  salesPersonName: string;
}

const IPC_CHANNELS = {
  CREATE_POS_SALE: 'pos:sale:create',
  GET_POS_PRODUCTS: 'pos:products:get',
  GET_POS_PRODUCTS_BY_CATEGORY: 'pos:products:get-by-category',
  SEARCH_POS_PRODUCTS: 'pos:products:search',
};

export function registerPOSHandlers() {
  ipcMain.handle(IPC_CHANNELS.CREATE_POS_SALE, async (event, request: POSSaleRequest) => {
    const t = await sequelize.transaction();
    console.log(request)

    try {
      // Calculate profit only
      let totalProfit = 0;

      // Process cart items sequentially to calculate profit
      for (const item of request.cartItems) {
        const product = await Product.findByPk(item.id);
        if (!product) {
          throw new Error(`Product not found: ${item.id}`);
        }
        const itemProfit = (item.actualPrice - product.purchasePrice) * item.quantity;
        totalProfit += itemProfit;
      }

      const netAmount = request.subtotal
      
      if (netAmount < 0) {
        throw new Error('Net amount cannot be negative');
      }

      // Create the sale
      const saleData: SalesAttributes = {
        shopId: request.shopId,
        status: 'completed',
        customer_id: request.customer?.id || null,
        deliveryStatus: 'delivered',
        netAmount: netAmount,
        amountPaid: request.amountPaid,
        changeGiven: request.changeGiven,
        deliveryFee: 0,
        discount: request.discount || 0,
        profit: totalProfit,
        paymentMethod: request.paymentMethod as 'cash' | 'card' | 'mobile_money' | 'bank_transfer',
        salesPersonId: request.salesPersonId,
      };

      const sale = await Sales.create(saleData, { transaction: t });

      // Create orders and update product quantities
      for (const item of request.cartItems) {
        // Create order with product name
        await Order.create({
          saleId: sale.id,
          product_id: item.id,
          inventory_item_id: item.inventoryItemId || undefined,
          productName: item.name,
          quantity: item.quantity,
          sellingPrice: item.actualPrice,
          paymentStatus: 'paid',
        }, { transaction: t });

        // Update product quantity and status
        await Product.decrement(
          'quantity', 
          { 
            by: item.quantity,
            where: { id: item.id },
            transaction: t 
          }
        );

        // If an inventory item ID is provided, update that specific inventory item's quantity
        if (item.inventoryItemId) {
          console.log(`Processing inventory update for product ${item.id}, inventory item ID: ${item.inventoryItemId}`);
          
          // Find the inventory item - use the inventoryItemId directly if available
          const inventoryItemQuery = {
            where: item.warehouseId ? 
              // If we have a warehouseId (inventory_id), use that with product_id
              {
                inventory_id: item.warehouseId,
                product_id: item.id
              } :
              // Otherwise, try to find by the inventory item's own ID
              {
                id: item.inventoryItemId,
                product_id: item.id
              },
            transaction: t
          };
          
          console.log(`Inventory item query:`, inventoryItemQuery);
          const inventoryItem = await InventoryItem.findOne(inventoryItemQuery);

          if (inventoryItem) {
            console.log(`Found inventory item: ${JSON.stringify({
              id: inventoryItem.id,
              product_id: inventoryItem.product_id,
              inventory_id: inventoryItem.inventory_id,
              quantity: inventoryItem.quantity_left
            })}`);
            
            // Check if there's enough quantity in this specific inventory
            if (inventoryItem.quantity_left < item.quantity) {
              throw new Error(`Insufficient stock for product ${item.name} in the selected inventory`);
            }

            // Update inventory item quantity
            await inventoryItem.decrement('quantity_left', {
              by: item.quantity,
              transaction: t
            });
            console.log(`Decremented inventory item quantity by ${item.quantity}`);

            // Update inventory item status based on new quantity
            const updatedInventoryItem = await InventoryItem.findOne(inventoryItemQuery);

            if (updatedInventoryItem) {
              console.log(`Updated inventory item quantity: ${updatedInventoryItem.quantity_left}`);
              const newStatus = updatedInventoryItem.quantity_left <= 0 ? 'out_of_stock' :
                              updatedInventoryItem.quantity_left <= (updatedInventoryItem.reorder_point ?? 10) ? 'low_stock' :
                              'in_stock';
              
              await updatedInventoryItem.update({ 
                status: newStatus
              }, { transaction: t });
              console.log(`Updated inventory item status to: ${newStatus}`);
            } else {
              console.log(`Could not find updated inventory item after decrement`);
            }
          } else {
            console.log(`No inventory item found for product ${item.id} with inventory item ID ${item.inventoryItemId}`);
          }
        } else {
          console.log(`No inventory item ID provided for product ${item.id}`);
        }

        const product = await Product.findByPk(item.id, { transaction: t });
        if (product) {
          const newStatus = product.quantity <= 0 ? 'out_of_stock' :
                           product.quantity <= (product.reorderPoint ?? 10) ? 'low_stock' :
                           product.quantity <= (product.reorderPoint ?? 10) * 2 ? 'medium_stock' :
                           'high_stock';
          await product.update({ 
            status: newStatus as 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock'
          }, { transaction: t });
        }
      }

      // Fetch the OHADA code ID for sales
      const ohadaCode = await OhadaCode.findOne({ 
        where: { code: '701' }, 
        transaction: t 
      });

      if (!ohadaCode) {
        throw new Error('Sales OHADA code not found');
      }

      // Create income entry for the sale
      await Income.create({
        date: new Date(),
        description: `Sales revenue - Order #${sale.id}`,
        amount: netAmount,
        paymentMethod: request.paymentMethod,
        ohadaCodeId: ohadaCode.id, // Use the fetched ID
        shopId: request.shopId,
      }, { transaction: t });

      // Create receipt
      const receipt = await Receipt.create({
        sale_id: sale.id,
        amount: netAmount,
        status: 'paid'
      }, { transaction: t });

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

      // Prepare receipt data
      const receiptData = {
        saleId: sale.id,
        receiptId: receipt.id,
        date: new Date(),
        items: request.cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          sellingPrice: item.actualPrice
        })),
        customerName: request.customer?.name || 'Walk-in Customer',
        customerPhone: request.customer?.phone || '',
        subtotal: request.subtotal,
        discount: request.discount || 0,
        total: netAmount,
        amountPaid: request.amountPaid,
        change: request.changeGiven,
        paymentMethod: request.paymentMethod,
        salesPersonId: request.salesPersonId,
        salesPersonName: request.salesPersonName
      };

      await t.commit();

      return {
        success: true,
        sale: completeSale.get({ plain: true }),
        receipt: receiptData
      };
    } catch (error) {
      await t.rollback();
      console.error('POS Sale Error:', error);
      return { success: false, message: 'Error processing sale', error };
    }
  });

  // Get all products for POS
  ipcMain.handle(IPC_CHANNELS.GET_POS_PRODUCTS, async (event, { shop_id }) => {
    try {
      const products = await Product.findAll({
        where: { 
          shop_id,
          status: ['high_stock', 'medium_stock', 'low_stock'] // Only get products in stock
        },
        include: ['category'],
        order: [['name', 'ASC']]
      });
      return { success: true, products };
    } catch (error) {
      console.error('Error fetching POS products:', error);
      return { 
        success: false, 
        message: 'Error fetching products',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get products by category
  ipcMain.handle(IPC_CHANNELS.GET_POS_PRODUCTS_BY_CATEGORY, async (event, { shop_id, category_id }) => {
    try {
      const products = await Product.findAll({
        where: { 
          shop_id,
          category_id,
          status: ['high_stock', 'medium_stock', 'low_stock']
        },
        include: ['category'],
        order: [['name', 'ASC']]
      });
      return { success: true, products };
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return { 
        success: false, 
        message: 'Error fetching products by category',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Search products
  ipcMain.handle(IPC_CHANNELS.SEARCH_POS_PRODUCTS, async (event, { shop_id, searchTerm }) => {
    try {
      const products = await Product.findAll({
        where: {
          shop_id,
          status: ['high_stock', 'medium_stock', 'low_stock'],
          [Op.or]: [
            { name: { [Op.iLike]: `%${searchTerm}%` } },
            { sku: { [Op.iLike]: `%${searchTerm}%` } }
          ]
        },
        include: ['category'],
        order: [['name', 'ASC']]
      });
      return { success: true, products };
    } catch (error) {
      console.error('Error searching products:', error);
      return { 
        success: false, 
        message: 'Error searching products',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export { IPC_CHANNELS }; 