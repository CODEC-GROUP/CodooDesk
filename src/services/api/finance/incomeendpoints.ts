import { ipcMain } from 'electron';
import { Op } from 'sequelize';
import Income, { IncomeAttributes } from '../../../models/Income.js';
import OhadaCode from '../../../models/OhadaCode.js';
import Shop from '../../../models/Shop.js';

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
      // Fetch the created income with relations
      const incomeWithRelations = await Income.findByPk(income.id, {
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
      const plainIncome = incomeWithRelations?.get({ plain: true });
      return { success: true, message: 'Income created successfully', income: plainIncome };
    } catch (error) {
      return { success: false, message: 'Error creating income', error };
    }
  });

  // Get all incomes handler with OHADA code info
  ipcMain.handle(IPC_CHANNELS.GET_ALL_INCOMES, async (event, { userId, userRole, shopIds }) => {
    try {
      let whereClause = {};
      
      // If shopIds are provided, filter by those shops
      if (shopIds && shopIds.length > 0) {
        whereClause = {
          ...whereClause,
          shopId: {
            [Op.in]: shopIds
          }
        };
      }

      const incomes = await Income.findAll({
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
      const serializableIncomes = incomes.map(income => income.get({ plain: true }));

      return { success: true, incomes: serializableIncomes };
    } catch (error) {
      return { success: false, message: 'Error fetching incomes', error };
    }
  });

  // Get single income with OHADA code info
  ipcMain.handle(IPC_CHANNELS.GET_INCOME, async (event, { id }) => {
    try {
      const income = await Income.findByPk(id, {
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
      return { success: true, income };
    } catch (error) {
      return { success: false, message: 'Error fetching income', error };
    }
  });

  // Update income handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_INCOME, async (event, { id, data }) => {
    try {
      const income = await Income.findByPk(id);
      if (!income) {
        return { success: false, message: 'Income not found' };
      }
      await income.update(data);
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
