import { ipcMain } from 'electron';
import Receipt, { ReceiptAttributes } from '../../../models/Receipt.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_RECEIPT: 'entities:receipt:create',
  GET_ALL_RECEIPTS: 'entities:receipt:get-all',
  GET_RECEIPT: 'entities:receipt:get',
  UPDATE_RECEIPT: 'entities:receipt:update',
  DELETE_RECEIPT: 'entities:receipt:delete'
};

// Register IPC handlers
export function registerReceiptHandlers() {
  // Create receipt handler
  ipcMain.handle(IPC_CHANNELS.CREATE_RECEIPT, async (event, { receiptData }) => {
    try {
      const receipt = await Receipt.create(receiptData);
      return { success: true, message: 'Receipt created successfully', receipt };
    } catch (error) {
      return { success: false, message: 'Error creating receipt', error };
    }
  });

  // Get all receipts handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_RECEIPTS, async () => {
    try {
      const receipts = await Receipt.findAll({
        include: ['sale', 'payment'],
      });
      return { success: true, receipts };
    } catch (error) {
      return { success: false, message: 'Error fetching receipts', error };
    }
  });

  // Get receipt by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_RECEIPT, async (event, { id }) => {
    try {
      const receipt = await Receipt.findByPk(id, {
        include: ['sale', 'payment'],
      });
      if (!receipt) {
        return { success: false, message: 'Receipt not found' };
      }
      return { success: true, receipt };
    } catch (error) {
      return { success: false, message: 'Error retrieving receipt', error };
    }
  });

  // Update receipt handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_RECEIPT, async (event, { id, updates }) => {
    try {
      const receipt = await Receipt.findByPk(id);
      if (!receipt) {
        return { success: false, message: 'Receipt not found' };
      }
      await receipt.update(updates);
      return { success: true, message: 'Receipt updated successfully', receipt };
    } catch (error) {
      return { success: false, message: 'Error updating receipt', error };
    }
  });

  // Delete receipt handler
  ipcMain.handle(IPC_CHANNELS.DELETE_RECEIPT, async (event, { id }) => {
    try {
      const receipt = await Receipt.findByPk(id);
      if (!receipt) {
        return { success: false, message: 'Receipt not found' };
      }
      await receipt.destroy();
      return { success: true, message: 'Receipt deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting receipt', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
