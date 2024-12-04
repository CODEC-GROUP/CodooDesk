import { ipcMain } from 'electron';
import { Op } from 'sequelize';
import Sales, { SalesAttributes } from '../../../models/Sales.js';
import Order, { OrderAttributes } from '../../../models/Order.js';
import Product from '../../../models/Product.js';
import Income from '../../../models/Income.js';
import { sequelize } from '../../database/index.js';
import OhadaCode from '../../../models/OhadaCode.js';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  actualPrice: number;
}

interface POSSaleRequest {
  cartItems: CartItem[];
  customer: {
    id: string;
    name: string;
    phone: string;
  } | null;
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
  amountPaid: number;
  changeGiven: number;
  shopId: string;
  discount?: number;
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

    try {
      // Calculate totals and profit
      const totals = await request.cartItems.reduce(async (promise, item) => {
        const acc = await promise;
        const product = await Product.findByPk(item.id);
        if (!product) {
          throw new Error(`Product not found: ${item.id}`);
        }
        const itemTotal = item.actualPrice * item.quantity;
        const itemProfit = (item.actualPrice - product.purchasePrice) * item.quantity;
        return {
          subtotal: acc.subtotal + itemTotal,
          profit: acc.profit + itemProfit
        };
      }, Promise.resolve({ subtotal: 0, profit: 0 }));

      const netAmount = totals.subtotal - (request.discount || 0);
      
      // Create the sale
      const saleData: SalesAttributes = {
        shopId: request.shopId,
        status: 'completed',
        customer_id: request.customer?.id || null,
        deliveryStatus: 'delivered',
        netAmount,
        amountPaid: request.amountPaid,
        changeGiven: request.changeGiven,
        deliveryFee: 0,
        discount: request.discount || 0,
        profit: totals.profit,
        paymentMethod: request.paymentMethod,
      };

      const sale = await Sales.create(saleData, { transaction: t });

      // Create orders and update product quantities
      for (const item of request.cartItems) {
        // Create order
        await Order.create({
          saleId: sale.id,
          product_id: item.id,
          quantity: item.quantity,
          paymentStatus: 'paid',
        }, { transaction: t });

        // Update product quantity
        await Product.decrement(
          'quantity', 
          { 
            by: item.quantity,
            where: { id: item.id },
            transaction: t 
          }
        );

        // Update product status
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

      await t.commit();
      return { success: true, message: 'Sale completed successfully', sale };
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