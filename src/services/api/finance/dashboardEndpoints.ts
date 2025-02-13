import { ipcMain } from 'electron';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import Income from '../../../models/Income.js';
import Expense from '../../../models/Expense.js';
import Sales from '../../../models/Sales.js';
import Shop from '../../../models/Shop.js';
import Order from '../../../models/Order.js'; 
import { sequelize } from '../../database/index.js';

const IPC_CHANNELS = {
  GET_FINANCE_DASHBOARD: 'finance:dashboard:get',
};

export function registerFinanceDashboardHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_FINANCE_DASHBOARD, async (event, { businessId, dateRange }) => {
    try {
      const { start, end } = dateRange;

      // Fetch overview data
      const [totalIncome, totalExpenses, salesData]: [number | null, number | null, any] = await Promise.all([
        Income.sum('amount', {
          where: {
            shopId: {
              [Op.in]: sequelize.literal(`(SELECT id FROM Shops WHERE businessId = ${businessId})`)
            },
            date: { [Op.between]: [start, end] }
          }
        }),
        Expense.sum('amount', {
          where: {
            '$shop.businessId$': businessId,
            date: { [Op.between]: [start, end] }
          }
        }),
        Sales.findAndCountAll({
          include: [{
            model: Shop,
            as: 'shop',
            where: {
              businessId: businessId
            }
          }],
          where: {
            createdAt: { [Op.between]: [start, end] }
          }
        })
      ]);

      // Fetch monthly data
      const monthlyData = await sequelize.query(
        `SELECT 
          DATE_TRUNC('month', i.date) as month,
          SUM(i.amount) as income
        FROM incomes i
        JOIN shops s ON i.shop_id = s.id
        WHERE s.business_id = :businessId
        GROUP BY DATE_TRUNC('month', i.date)
        ORDER BY month DESC
        LIMIT 6`,
        {
          replacements: { businessId },
          type: QueryTypes.SELECT
        }
      );

      // Fetch expense categories
      const expenseCategories = await Expense.findAll({
        attributes: [
          'category',
          [sequelize.fn('SUM', sequelize.col('amount')), 'value']
        ],
        include: [{
          model: Shop,
          as: 'shop',
          where: {
            businessId: businessId
          }
        }],
        where: {
          date: { [Op.between]: [start, end] }
        },
        group: ['category']
      });

      // Fetch recent transactions
      const recentTransactions = await Promise.all([
        Income.findAll({
          include: [{
            model: Shop,
            where: { businessId: businessId },
            attributes: []
          }],
          limit: 5,
          order: [['date', 'DESC']]
        }),
        Expense.findAll({
          include: [{
            model: Shop,
            where: { businessId: businessId },
            attributes: []
          }],
          limit: 5,
          order: [['date', 'DESC']]
        })
      ]);

      return {
        success: true,
        data: {
          /**
           * An overview of the finance dashboard data
           *
           * @property {number} total_income - The total income for the given date range
           * @property {number} total_expenses - The total expenses for the given date range
           * @property {number} totalOrders - The total number of sales for the given date range
           * @property {number} totalItems - The total number of items sold for the given date range
           */
          overview: {
            total_income: totalIncome || 0,
            total_expenses: totalExpenses || 0,
            totalOrders: salesData.count,
            totalItems: await Shop.findAll({
              where: { businessId },
              attributes: ['id']
            }).then(async shops => {
              const shopIds = shops.map(shop => shop.id);
              return Sales.findAll({
                where: { shopId: { [Op.in]: shopIds } },
                include: [{
                  model: Order,
                  attributes: ['quantity']
                }],
                attributes: [
                  [Sequelize.fn('SUM', Sequelize.col('orders.quantity')), 'total_quantity']
                ],
                raw: true
              }).then(result => (result[0] as any)?.total_quantity || 0);
            })
          },
          monthlyData,
          expenseCategories,
          topIncomeSources: [], // Implement based on your data structure
          recentTransactions: [...recentTransactions[0], ...recentTransactions[1]]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5)
        }
      };

    } catch (error) {
      console.error('Error fetching finance dashboard:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch finance dashboard'
      };
    }
  });
}

export { IPC_CHANNELS }; 