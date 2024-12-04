import { ipcMain } from 'electron';
import { Op } from 'sequelize';
import Sales from '../../../models/Sales.js';
import Order from '../../../models/Order.js';
import { sequelize } from '../../database/index.js';
import Product from '../../../models/Product.js';
import OhadaCode from '../../../models/OhadaCode.js';
import Income from '../../../models/Income.js';

const IPC_CHANNELS = {
  CREATE_SALE_WITH_ORDERS: 'order-management:create-sale',
  GET_SALES_WITH_ORDERS: 'order-management:get-sales',
  GET_SALE_DETAILS: 'order-management:get-sale-details',
  UPDATE_SALE_STATUS: 'order-management:update-sale-status',
};

interface OrderItem {
  productId: string;
  quantity: number;
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
    deliveryStatus,
    amountPaid,
    changeGiven,
    shopId,
    discount = 0,
    deliveryFee = 0
  }) => {
    const t = await sequelize.transaction();

    try {
      // Calculate total and profit
      const orderTotals = await orderItems.reduce(async (promise: Promise<OrderTotals>, item: OrderItem) => {
        const acc = await promise;
        const product = await Product.findByPk(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        const itemTotal = item.quantity * product.sellingPrice;
        const itemProfit = item.quantity * (product.sellingPrice - product.purchasePrice);
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
        status: 'completed',
        customer_id: customer?.id || null,
        deliveryStatus,
        netAmount: netAmount || amountPaid,
        amountPaid,
        changeGiven,
        deliveryFee: deliveryFee || 0,
        discount: discount || 0,
        profit: orderTotals.profit,
        paymentMethod
      }, { transaction: t });

      // Add after creating the sale
      const ohadaCode = await OhadaCode.findOne({
        where: { code: '701' },
        transaction: t
      });

      if (!ohadaCode) {
        throw new Error('Sales OHADA code not found');
      }

      await Income.create({
        date: new Date(),
        description: `Sales revenue - Order #${sale.id}`,
        amount: netAmount,
        paymentMethod: paymentMethod,
        ohadaCodeId: ohadaCode.id,
        shopId: shopId,
      }, { transaction: t });

      // Create orders and update product quantities
      for (const item of orderItems) {
        // Create order
        await Order.create({
          saleId: sale.id,
          product_id: item.productId,
          quantity: item.quantity,
          paymentStatus: 'paid',
        }, { transaction: t });

        // Update product quantity
        await Product.decrement(
          'quantity',
          {
            by: item.quantity,
            where: { id: item.productId },
            transaction: t
          }
        );

        // Update product status based on new quantity
        const product = await Product.findByPk(item.productId, { transaction: t });
        if (product) {
          const newStatus = product.quantity <= 0 ? 'out_of_stock' :
            product.quantity <= (product.reorderPoint || 0) ? 'low_stock' :
              product.quantity <= ((product.reorderPoint || 0) * 2) ? 'medium_stock' :
                'high_stock';
          await product.update({ status: newStatus }, { transaction: t });
        }
      }

      await t.commit();
      return { success: true, sale };
    } catch (error) {
      await t.rollback();
      return { success: false, error };
    }
  });

  // Get all sales with their orders
  ipcMain.handle(IPC_CHANNELS.GET_SALES_WITH_ORDERS, async (event, {
    shopId,
    page = 1,
    limit = 10,
    status,
    dateRange,
  }) => {
    try {
      const where: any = { shopId };

      if (status) where.status = status;
      if (dateRange) {
        where.createdAt = {
          [Op.between]: [dateRange.start, dateRange.end]
        };
      }

      const sales = await Sales.findAndCountAll({
        where,
        include: [
          {
            model: Order,
            as: 'orders',
            include: ['product']
          },
          'customer'
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });

      return {
        success: true,
        sales: sales.rows,
        total: sales.count,
        pages: Math.ceil(sales.count / limit)
      };
    } catch (error) {
      return { success: false, error };
    }
  });

  // Get detailed sale information
  ipcMain.handle(IPC_CHANNELS.GET_SALE_DETAILS, async (event, { saleId }) => {
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

      return { success: true, sale };
    } catch (error) {
      return { success: false, error };
    }
  });

  // Update sale status
  ipcMain.handle(IPC_CHANNELS.UPDATE_SALE_STATUS, async (event, {
    saleId,
    deliveryStatus,
    paymentStatus
  }) => {
    const t = await sequelize.transaction();

    try {
      const sale = await Sales.findByPk(saleId);
      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }

      await sale.update({
        deliveryStatus,
        status: paymentStatus === 'paid' ? 'completed' : 'pending'
      }, { transaction: t });

      if (paymentStatus) {
        await Order.update(
          { paymentStatus },
          {
            where: { saleId },
            transaction: t
          }
        );
      }

      await t.commit();
      return { success: true, sale };
    } catch (error) {
      await t.rollback();
      return { success: false, error };
    }
  });
}

export { IPC_CHANNELS };