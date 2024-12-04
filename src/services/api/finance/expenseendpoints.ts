import { ipcMain } from 'electron';
import Expense from '../../../models/Expense.js';
import OhadaCode from '../../../models/OhadaCode.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_EXPENSE: 'finance:expense:create',
  GET_ALL_EXPENSES: 'finance:expense:get-all',
  GET_EXPENSE: 'finance:expense:get',
  UPDATE_EXPENSE: 'finance:expense:update',
  DELETE_EXPENSE: 'finance:expense:delete'
};

// Register IPC handlers
export function registerExpenseHandlers() {
  // Create expense handler
  ipcMain.handle(IPC_CHANNELS.CREATE_EXPENSE, async (event, { data }) => {
    try {
      const expense = await Expense.create(data);
      return { success: true, message: 'Expense created successfully', expense };
    } catch (error) {
      return { success: false, message: 'Error creating expense', error };
    }
  });

  // Get all expenses handler with OHADA code info
  ipcMain.handle(IPC_CHANNELS.GET_ALL_EXPENSES, async () => {
    try {
      const expenses = await Expense.findAll({
        include: [{
          model: OhadaCode,
          as: 'ohadaCode',
          attributes: ['id', 'code', 'name', 'description']
        }],
        order: [['date', 'DESC']]
      });
      return { success: true, expenses };
    } catch (error) {
      return { success: false, message: 'Error fetching expenses', error };
    }
  });

  // Get expense by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_EXPENSE, async (event, { id }) => {
    try {
      const expense = await Expense.findByPk(id, {
        include: [{
          model: OhadaCode,
          as: 'ohadaCode',
          attributes: ['id', 'code', 'name', 'description']
        }]
      });
      if (!expense) {
        return { success: false, message: 'Expense not found' };
      }
      return { success: true, expense };
    } catch (error) {
      return { success: false, message: 'Error retrieving expense', error };
    }
  });

  // Update expense handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_EXPENSE, async (event, { id, updates }) => {
    try {
      const expense = await Expense.findByPk(id);
      if (!expense) {
        return { success: false, message: 'Expense not found' };
      }
      await expense.update(updates);
      return { success: true, message: 'Expense updated successfully', expense };
    } catch (error) {
      return { success: false, message: 'Error updating expense', error };
    }
  });

  // Delete expense handler
  ipcMain.handle(IPC_CHANNELS.DELETE_EXPENSE, async (event, { id }) => {
    try {
      const expense = await Expense.findByPk(id);
      if (!expense) {
        return { success: false, message: 'Expense not found' };
      }
      await expense.destroy();
      return { success: true, message: 'Expense deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting expense', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
