import { ipcMain } from 'electron';
import { Op } from 'sequelize';
import Expense from '../../../models/Expense.js';
import OhadaCode from '../../../models/OhadaCode.js';
import Shop from '../../../models/Shop.js';
import { sequelize } from '../../database/index.js';

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
      // Fetch the created expense with relations
      const expenseWithRelations = await Expense.findByPk(expense.id, {
        include: [
          {
            model: OhadaCode,
            as: 'ohadaCode',
            attributes: ['id', 'code', 'name', 'description']
          },
          {
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name']
          }
        ]
      });
      
      // Convert to plain object to match fetch endpoint format
      const plainExpense = expenseWithRelations?.get({ plain: true });
      return { success: true, message: 'Expense created successfully', expense: plainExpense };
    } catch (error) {
      return { success: false, message: 'Error creating expense', error };
    }
  });

  // Get all expenses handler with OHADA code info
  ipcMain.handle(IPC_CHANNELS.GET_ALL_EXPENSES, async (event, { userId, userRole, shopId, shopIds }) => {
    try {
      // Validate shop ID requirement
      if (!shopId && (!shopIds || !shopIds.length)) {
        return {
          success: false,
          message: 'Shop ID or shop IDs are required',
          expenses: [],
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

      const expenses = await Expense.findAll({
        where: whereClause,
        include: [
          {
            model: OhadaCode,
            as: 'ohadaCode',
            attributes: ['id', 'code', 'name', 'description']
          },
          {
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name']
          }
        ],
        order: [['date', 'DESC']]
      });

      // Ensure the data is serializable
      const serializableExpenses = expenses.map(expense => expense.get({ plain: true }));

      return { success: true, expenses: serializableExpenses };
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error fetching expenses',
        expenses: []
      };
    }
  });

  // Get expense by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_EXPENSE, async (event, { id }) => {
    try {
      const expense = await Expense.findByPk(id, {
        include: [
          {
            model: OhadaCode,
            as: 'ohadaCode',
            attributes: ['id', 'code', 'name', 'description']
          },
          {
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name']
          }
        ]
      });
      return { success: true, expense };
    } catch (error) {
      return { success: false, message: 'Error fetching expense', error };
    }
  });

  // Update expense handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_EXPENSE, async (event, { id, data }) => {
    const t = await sequelize.transaction();

    try {
      const expense = await Expense.findByPk(id, {
        include: [
          {
            model: OhadaCode,
            as: 'ohadaCode',
            attributes: ['id', 'code', 'name', 'description']
          },
          {
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name']
          }
        ],
        transaction: t
      });

      if (!expense) {
        await t.rollback();
        return { success: false, message: 'Expense not found' };
      }

      // Update the expense
      await expense.update({
        date: data.date,
        description: data.description,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        ohadaCodeId: data.ohadaCodeId,
        shopId: data.shopId
      }, { transaction: t });

      // Fetch the updated expense with all relations
      const updatedExpense = await Expense.findByPk(id, {
        include: [
          {
            model: OhadaCode,
            as: 'ohadaCode',
            attributes: ['id', 'code', 'name', 'description']
          },
          {
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name']
          }
        ],
        transaction: t
      });

      await t.commit();

      // Convert to plain object to ensure it's serializable
      const plainExpense = updatedExpense?.get({ plain: true });

      return { 
        success: true, 
        message: 'Expense updated successfully', 
        expense: plainExpense 
      };

    } catch (error) {
      await t.rollback();
      console.error('Error updating expense:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error updating expense'
      };
    }
  });

  // Delete expense handler
  ipcMain.handle(IPC_CHANNELS.DELETE_EXPENSE, async (event, { id }) => {
    const t = await sequelize.transaction();

    try {
      const expense = await Expense.findByPk(id, { transaction: t });
      
      if (!expense) {
        await t.rollback();
        return { success: false, message: 'Expense not found' };
      }

      await expense.destroy({ transaction: t });
      await t.commit();

      return { success: true, message: 'Expense deleted successfully' };
    } catch (error) {
      await t.rollback();
      console.error('Error deleting expense:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error deleting expense'
      };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
