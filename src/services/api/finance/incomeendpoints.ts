import { ipcMain } from 'electron';
import { Op } from 'sequelize';
import Income, { IncomeAttributes } from '../../../models/Income.js';
import OhadaCode from '../../../models/OhadaCode.js';
import Shop from '../../../models/Shop.js';
import { sequelize } from '../../database/index.js';

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
  ipcMain.handle(IPC_CHANNELS.GET_ALL_INCOMES, async (event, { userId, userRole, shopId, shopIds }) => {
    try {
      // Validate shop ID requirement
      if (!shopId && (!shopIds || !shopIds.length)) {
        return {
          success: false,
          message: 'Shop ID or shop IDs are required',
          incomes: [],
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
      console.error('Error fetching incomes:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error fetching incomes',
        incomes: []
      };
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
    const t = await sequelize.transaction();

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
        ],
        transaction: t
      });

      if (!income) {
        await t.rollback();
        return { success: false, message: 'Income not found' };
      }

      // Update the income
      await income.update({
        date: data.date,
        description: data.description,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        ohadaCodeId: data.ohadaCodeId,
        shopId: data.shopId
      }, { transaction: t });

      // Fetch the updated income with all relations
      const updatedIncome = await Income.findByPk(id, {
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
      const plainIncome = updatedIncome?.get({ plain: true });

      return { 
        success: true, 
        message: 'Income updated successfully', 
        income: plainIncome 
      };

    } catch (error) {
      await t.rollback();
      console.error('Error updating income:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error updating income'
      };
    }
  });

  // Delete income handler
  ipcMain.handle(IPC_CHANNELS.DELETE_INCOME, async (event, { id }) => {
    const t = await sequelize.transaction();

    try {
      const income = await Income.findByPk(id, { transaction: t });
      
      if (!income) {
        await t.rollback();
        return { success: false, message: 'Income not found' };
      }

      await income.destroy({ transaction: t });
      await t.commit();

      return { success: true, message: 'Income deleted successfully' };
    } catch (error) {
      await t.rollback();
      console.error('Error deleting income:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error deleting income'
      };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
