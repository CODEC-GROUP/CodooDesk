import { ipcMain } from 'electron';
import { sequelize } from '../../database/index.js';
import Return, { ReturnAttributes } from '../../../models/Return.js';
import Product from '../../../models/Product.js';
import Order from '../../../models/Order.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_RETURN: 'entities:return:create',
  GET_ALL_RETURNS: 'entities:return:get-all',
  GET_RETURN: 'entities:return:get',
  UPDATE_RETURN: 'entities:return:update',
  DELETE_RETURN: 'entities:return:delete'
};

// Register IPC handlers
export function registerReturnHandlers() {
  // Create return handler with product quantity update
  ipcMain.handle(IPC_CHANNELS.CREATE_RETURN, async (event, { returnData }) => {
    const t = await sequelize.transaction();

    try {
      // Get the specific order
      const order = await Order.findByPk(returnData.orderId, {
        include: [
          {
            model: Product,
            as: 'product'
          }
        ],
        transaction: t
      });

      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Create return record
      const returnInstance = await Return.create({
        ...returnData,
        status: 'pending',
        date: new Date()
      }, { transaction: t });

      // Update product quantity
      await Product.increment(
        'quantity',
        {
          by: returnData.quantity,
          where: { id: order.product_id },
          transaction: t
        }
      );

      await t.commit();
      return { 
        success: true, 
        message: 'Return processed successfully', 
        return: returnInstance 
      };
    } catch (error) {
      await t.rollback();
      return { success: false, message: 'Error processing return', error };
    }
  });

  // Get all returns handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_RETURNS, async () => {
    try {
      const returns = await Return.findAll({
        include: ['order', 'inventory'],
      });
      return { success: true, returns };
    } catch (error) {
      return { success: false, message: 'Error fetching returns', error };
    }
  });

  // Get return by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_RETURN, async (event, { id }) => {
    try {
      const returnInstance = await Return.findByPk(id, {
        include: ['order', 'inventory'],
      });
      if (!returnInstance) {
        return { success: false, message: 'Return not found' };
      }
      return { success: true, return: returnInstance };
    } catch (error) {
      return { success: false, message: 'Error retrieving return', error };
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
    } catch (error) {
      return { success: false, message: 'Error updating return', error };
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
    } catch (error) {
      return { success: false, message: 'Error deleting return', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
