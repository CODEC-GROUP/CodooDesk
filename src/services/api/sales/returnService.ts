import { ipcMain } from 'electron';
import { sequelize } from '../../database/index.js';
import { Op } from 'sequelize';
import Return, { ReturnAttributes } from '../../../models/Return.js';
import Product from '../../../models/Product.js';
import Sales from '../../../models/Sales.js';
import Order from '../../../models/Order.js';
import Customer from '../../../models/Customer.js';

const IPC_CHANNELS = {
  CREATE_RETURN: 'entities:return:create',
  GET_ALL_RETURNS: 'entities:return:get-all',
  GET_RETURN: 'entities:return:get',
  UPDATE_RETURN: 'entities:return:update',
  DELETE_RETURN: 'entities:return:delete',
  SEARCH_SALE: 'entities:return:search-sale',
  GET_SALE_SUGGESTIONS: 'entities:return:get-suggestions',
  SEARCH_RETURN: 'entities:return:search-return',
  APPROVE_RETURN: 'entities:return:approve',
  REJECT_RETURN: 'entities:return:reject'
};

export function registerReturnHandlers() {
  // Get sale suggestions as user types
  ipcMain.handle(IPC_CHANNELS.GET_SALE_SUGGESTIONS, async (event, { searchTerm, shopId }) => {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return { success: true, suggestions: [] };
      }

      const searchWords = searchTerm.toLowerCase().split(' ');
      
      // Search for sales with matching customer name or reference numbers
      const sales = await Sales.findAll({
        where: {
          [Op.or]: [
            { id: { [Op.like]: `%${searchTerm}%` } },
            { receipt_id: { [Op.like]: `%${searchTerm}%` } },
            { invoice_id: { [Op.like]: `%${searchTerm}%` } },
            {
              [Op.and]: searchWords.map((word: string) => ({
                '$customer.first_name$': { [Op.like]: `%${word}%` }
              }))
            },
            {
              [Op.and]: searchWords.map((word: string) => ({
                '$customer.last_name$': { [Op.like]: `%${word}%` }
              }))
            }
          ],
          shopId: shopId,
          status: 'completed' // Only show completed sales
        },
        include: [
          {
            model: Customer,
            attributes: ['first_name', 'last_name'],
            required: false
          }
        ],
        limit: 10
      });

      const suggestions = sales.map(sale => ({
        id: sale.id,
        receipt_id: sale.receipt_id || '',
        invoice_id: sale.invoice_id || '',
        customer_name: sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}` : 'Walk-in Customer',
        total_amount: sale.netAmount,
        created_at: sale.createdAt,
        display: `${sale.receipt_id || sale.invoice_id} - ${sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}` : 'Walk-in Customer'}`
      }));

      return { success: true, suggestions };
    } catch (error) {
      console.error('Error getting sale suggestions:', error);
      return { success: false, message: 'Failed to get sale suggestions' };
    }
  });

  // Create a new return
  ipcMain.handle(IPC_CHANNELS.CREATE_RETURN, async (event, { returnData }) => {
    const t = await sequelize.transaction();
  
    try {
      const { saleId, items, total, customer, shopId } = returnData;
      
      // Create individual returns for each item
      for (const item of items) {
        // Create the return record
        await Return.create({
          orderId: item.orderId,
          productId: item.productId,
          customerFirstName: customer.name,
          customerLastName: '',
          quantity: item.quantity,
          amount: item.price * item.quantity,
          reason: item.reason || 'Customer Return',
          paymentMethod: 'refund',
          status: 'pending',
          date: new Date(),
          shopId
        }, { transaction: t });

        // Update the corresponding order's quantity and payment status
        const order = await Order.findOne({
          where: { id: item.orderId },
          transaction: t
        });

        if (order) {
          const updatedQuantity = order.quantity - item.quantity;
          await order.update({
            quantity: updatedQuantity,
            paymentStatus: updatedQuantity === 0 ? 'refunded' : 'paid'
          }, { transaction: t });
        }

        // Update product stock quantity
        if (item.productId) {
          const product = await Product.findByPk(item.productId, { transaction: t });
          if (product) {
            await product.update({
              quantity: product.quantity + item.quantity
            }, { transaction: t });
          }
        }
      }

      // Update the sale's net amount
      const sale = await Sales.findByPk(saleId, { transaction: t });
      if (sale) {
        const newNetAmount = sale.netAmount - total;
        await sale.update({
          netAmount: newNetAmount,
          status: newNetAmount === 0 ? 'cancelled' : 'completed'
        }, { transaction: t });
      }

      await t.commit();

      return { success: true, message: 'Returns processed successfully' };
    } catch (error) {
      await t.rollback();
      console.error('Error creating return:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create return' 
      };
    }
  });

  // Search sale and get details
  ipcMain.handle(IPC_CHANNELS.SEARCH_SALE, async (event, { searchTerm }) => {
    try {
      const sale = await Sales.findByPk(searchTerm, {
        include: [
          {
            model: Order,
            attributes: ['id', 'product_id', 'productName', 'quantity', 'sellingPrice', 'paymentStatus'],
            include: [
              {
                model: Product,
                attributes: ['id', 'name', 'quantity', 'sellingPrice']
              }
            ]
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['first_name', 'last_name', 'phone_number']
          }
        ]
      });

      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }

      return { success: true, sale };
    } catch (error: Error | unknown) {
      console.error('Error searching sale:', error);
      if (error instanceof Error) {
        return { success: false, message: error.message };
      } else {
        return { success: false, message: 'Failed to search sale' };
      }
    }
  });

  // Get all returns handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_RETURNS, async (event, { userRole, shopId, shopIds }) => {
    try {
      const whereClause = {
        ...(userRole === 'admin' || userRole === 'shop_owner' 
          ? { shopId: { [Op.in]: shopIds } }
          : { shopId: shopId }
        )
      };

      const returns = await Return.findAll({
        where: whereClause,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return {
        success: true,
        returns
      };
    } catch (error) {
      console.error('Error fetching returns:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch returns'
      };
    }
  });

  // Get return by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_RETURN, async (event, { id }) => {
    try {
      const returnInstance = await Return.findByPk(id, {
        include: ['sale', 'product'],
      });
      if (!returnInstance) {
        return { success: false, message: 'Return not found' };
      }
      return { success: true, return: returnInstance };
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      } else {
        return { success: false, message: 'Error retrieving return' };
      }
    }
  });

  // Update return handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_RETURN, async (event, { id, updates }) => {
    try {
      const returnInstance = await Return.findByPk(id);
      if (!returnInstance) {
        return { success: false, message: 'Return not found' };
      }
      await returnInstance.update(updates);
      return { success: true, message: 'Return updated successfully', return: returnInstance };
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      } else {
        return { success: false, message: 'Error updating return' };
      }
    }
  });

  // Delete return handler
  ipcMain.handle(IPC_CHANNELS.DELETE_RETURN, async (event, { id }) => {
    try {
      const returnInstance = await Return.findByPk(id);
      if (!returnInstance) {
        return { success: false, message: 'Return not found' };
      }
      await returnInstance.destroy();
      return { success: true, message: 'Return deleted successfully' };
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      } else {
        return { success: false, message: 'Error deleting return' };
      }
    }
  });

  // Add approve return handler
  ipcMain.handle(IPC_CHANNELS.APPROVE_RETURN, async (event, { returnId }) => {
    try {
      const returnInstance = await Return.findByPk(returnId);
      if (!returnInstance) {
        return { success: false, message: 'Return not found' };
      }

      await returnInstance.update({ status: 'completed' });

      // Update product stock and order status as needed
      // Add your business logic here

      return { 
        success: true, 
        message: 'Return approved successfully',
        return: returnInstance
      };
    } catch (error) {
      console.error('Error approving return:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to approve return'
      };
    }
  });

  // Add reject return handler
  ipcMain.handle(IPC_CHANNELS.REJECT_RETURN, async (event, { returnId }) => {
    try {
      const returnInstance = await Return.findByPk(returnId);
      if (!returnInstance) {
        return { success: false, message: 'Return not found' };
      }

      await returnInstance.update({ status: 'pending' });

      return { 
        success: true, 
        message: 'Return rejected successfully',
        return: returnInstance
      };
    } catch (error) {
      console.error('Error rejecting return:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to reject return'
      };
    }
  });
}

export { IPC_CHANNELS };
