import { ipcMain } from 'electron';
import Income, { IncomeAttributes } from '../../../models/Income.js';
import OhadaCode from '../../../models/OhadaCode.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_INCOME: 'finance:income:create',
  GET_ALL_INCOMES: 'finance:income:get-all',
  GET_INCOME: 'finance:income:get',
  UPDATE_INCOME: 'finance:income:update',
  DELETE_INCOME: 'finance:income:delete'
};

// Register IPC handlers
export function registerIncomeHandlers() {
  // Create income handler
  ipcMain.handle(IPC_CHANNELS.CREATE_INCOME, async (event, { data }) => {
    try {
      const income = await Income.create(data);
      return { success: true, message: 'Income created successfully', income };
    } catch (error) {
      return { success: false, message: 'Error creating income', error };
    }
  });

  // Get all incomes handler with OHADA code info
  ipcMain.handle(IPC_CHANNELS.GET_ALL_INCOMES, async () => {
    try {
      const incomes = await Income.findAll({
        include: [{
          model: OhadaCode,
          as: 'ohadaCode',
          attributes: ['id', 'code', 'name', 'description']
        }],
        order: [['date', 'DESC']]
      });
      return { success: true, incomes };
    } catch (error) {
      return { success: false, message: 'Error fetching incomes', error };
    }
  });

  // Get single income with OHADA code info
  ipcMain.handle(IPC_CHANNELS.GET_INCOME, async (event, { id }) => {
    try {
      const income = await Income.findByPk(id, {
        include: [{
          model: OhadaCode,
          as: 'ohadaCode',
          attributes: ['id', 'code', 'name', 'description']
        }]
      });
      if (!income) {
        return { success: false, message: 'Income not found' };
      }
      return { success: true, income };
    } catch (error) {
      return { success: false, message: 'Error retrieving income', error };
    }
  });

  // Update income handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_INCOME, async (event, { id, updates }) => {
    try {
      const income = await Income.findByPk(id);
      if (!income) {
        return { success: false, message: 'Income not found' };
      }
      await income.update(updates);
      return { success: true, message: 'Income updated successfully', income };
    } catch (error) {
      return { success: false, message: 'Error updating income', error };
    }
  });

  // Delete income handler
  ipcMain.handle(IPC_CHANNELS.DELETE_INCOME, async (event, { id }) => {
    try {
      const income = await Income.findByPk(id);
      if (!income) {
        return { success: false, message: 'Income not found' };
      }
      await income.destroy();
      return { success: true, message: 'Income deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting income', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
