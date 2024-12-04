import { ipcMain } from 'electron';
import Sales, { SalesAttributes } from '../../../models/Sales.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_SALE: 'sales:create',
  GET_SALE: 'sales:get',
  UPDATE_SALE: 'sales:update',
  DELETE_SALE: 'sales:delete',
  GET_ALL_SALES: 'sales:get-all'
};

// Register IPC handlers
export function registerSalesHandlers() {
  // Create sale handler
  ipcMain.handle(IPC_CHANNELS.CREATE_SALE, async (event, { salesData }) => {
    try {
      const sale = await Sales.create(salesData);
      return { success: true, message: 'Sale created successfully', sale };
    } catch (error) {
      return { success: false, message: 'Error creating sale', error };
    }
  });

  // Get sale by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_SALE, async (event, { id }) => {
    try {
      const sale = await Sales.findByPk(id, {
        include: ['employee', 'orders', 'invoice', 'receipt'],
      });
      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }
      return { success: true, sale };
    } catch (error) {
      return { success: false, message: 'Error retrieving sale', error };
    }
  });

  // Update sale handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_SALE, async (event, { id, updateData }) => {
    try {
      const sale = await Sales.findByPk(id);
      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }
      const updatedSale = await sale.update(updateData);
      return { success: true, message: 'Sale updated successfully', sale: updatedSale };
    } catch (error) {
      return { success: false, message: 'Error updating sale', error };
    }
  });

  // Delete sale handler
  ipcMain.handle(IPC_CHANNELS.DELETE_SALE, async (event, { id }) => {
    try {
      const sale = await Sales.findByPk(id);
      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }
      await sale.destroy();
      return { success: true, message: 'Sale deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting sale', error };
    }
  });

  // Get all sales handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_SALES, async () => {
    try {
      const sales = await Sales.findAll({
        include: ['employee', 'orders', 'invoice', 'receipt'],
      });
      return { success: true, sales };
    } catch (error) {
      return { success: false, message: 'Error retrieving sales', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
