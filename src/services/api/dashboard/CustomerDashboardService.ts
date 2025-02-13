import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import Customer from '../../../models/Customer.js';
import Sales from '../../../models/Sales.js';
import { createErrorResponse, createSuccessResponse } from '../../../utils/errorHandling.js';
import { sequelize } from '../../database/index.js';

const IPC_CHANNELS = {
  GET_CUSTOMER_DASHBOARD: 'dashboard:customer:get',
  GET_TOP_CUSTOMERS: 'dashboard:customer:top',
  GET_CUSTOMER_TRENDS: 'dashboard:customer:trends'
};

export function registerCustomerDashboardHandlers() {
  ipcMain.handle('dashboard:customer:get', async (event: IpcMainInvokeEvent, { businessId, shopId, dateRange }) => {
    try {
      const whereClause = shopId ? { shopId } : { '$shop.businessId$': businessId };

      // Get customer stats
      const customerStats = await Customer.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_customers'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "lastPurchaseDate" >= NOW() - INTERVAL \'30 days\' THEN 1 END')), 'active_customers']
        ],
        raw: true
      });

      // Get top customers
      const topCustomers = await Sales.findAll({
        attributes: [
          'customerId',
          [sequelize.fn('SUM', sequelize.col('netAmount')), 'total_spent'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'purchase_count']
        ],
        include: [{
          model: Customer,
          attributes: ['firstName', 'lastName', 'email']
        }],
        where: whereClause,
        group: ['customerId', 'Customer.id'],
        order: [[sequelize.fn('SUM', sequelize.col('netAmount')), 'DESC']],
        limit: 10
      });

      return createSuccessResponse({
        stats: customerStats[0],
        topCustomers
      });
    } catch (error) {
      return createErrorResponse(error);
    }
  });
}

export const getCustomerDashboard = async () => {
  // Implementation
}; 