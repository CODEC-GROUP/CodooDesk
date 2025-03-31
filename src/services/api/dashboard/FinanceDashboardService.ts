import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { sequelize } from '../../database/index.js';
import Income from '../../../models/Income.js';
import Expense from '../../../models/Expense.js';
import Sales from '../../../models/Sales.js';
import Shop from '../../../models/Shop.js';
import Customer from '../../../models/Customer.js';
import { Op, fn, col, literal, QueryTypes } from 'sequelize';
import OhadaCode from '../../../models/OhadaCode.js';
import { InventoryDashboardData } from '../../../types/inventory.js';

const IPC_CHANNELS = {
  GET_FINANCE_DASHBOARD: 'dashboard:finance:get',
  GET_FINANCE_TRENDS: 'dashboard:finance:trends',
  GET_EXPENSE_BREAKDOWN: 'dashboard:finance:expenses',
  GET_INCOME_BREAKDOWN: 'dashboard:finance:income',
  GET_FINANCE_OVERVIEW: 'dashboard:finance:overview',
};

interface StatsResult {
  total_income?: number;
  total_expenses?: number;
  total_sales?: number;
  total_profit?: number;
  income_transactions?: number;
  expense_transactions?: number;
  total_transactions?: number;
}

export function registerFinanceDashboardHandlers() {
  ipcMain.handle('dashboard:finance:get', async (event: IpcMainInvokeEvent, { 
    businessId, 
    shopId,
    shopIds,
    dateRange 
  }) => {
    try {
      // Build where clause based on user access
      const shopWhereClause = shopIds?.length 
        ? { id: { [Op.in]: shopIds } }  // Admin with multiple shops
        : shopId 
          ? { id: shopId }  // Regular user with single shop
          : { businessId };  // Fallback to business scope

      // Where clause for the main models (Income, Expense)
      const whereClause = shopId 
        ? { shopId }  // If specific shop is selected, filter by shopId in main model
        : {};  // Otherwise no additional filtering needed for main model

      const dateWhereClause = dateRange ? {
        date: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      } : {};

      // Get total income and orders
      const incomeWhereClause = {
        ...dateWhereClause,
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      } as any;

      const [incomeStats] = await Income.findAll({
        where: incomeWhereClause,
        include: [{
          model: Shop,
          as: 'shop',
          where: shopWhereClause,
          required: true
        }],
        attributes: [
          [fn('SUM', col('amount')), 'total_income'],
          [fn('COUNT', sequelize.literal('DISTINCT Income.id')), 'totalOrders']
        ],
        raw: true
      }) as unknown as { total_income: number; totalOrders: number; }[];

      // Get total expenses
      const expenseWhereClause = {
        ...dateWhereClause,
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      } as any;

      const [expenseStats] = await Expense.findAll({
        where: expenseWhereClause,
        include: [{
          model: Shop,
          as: 'shop',
          where: shopWhereClause,
          required: true
        }],
        attributes: [
          [fn('SUM', col('amount')), 'total_expenses']
        ],
        raw: true
      }) as unknown as { total_expenses: number }[];

      // Get previous period income for growth calculation
      const prevDateRange = {
        start: new Date(new Date(dateRange.start).setMonth(new Date(dateRange.start).getMonth() - 1)),
        end: new Date(new Date(dateRange.end).setMonth(new Date(dateRange.end).getMonth() - 1))
      };

      const prevIncomeWhereClause = {
        date: {
          [Op.between]: [prevDateRange.start, prevDateRange.end]
        },
        createdAt: {
          [Op.between]: [prevDateRange.start, prevDateRange.end]
        }
      } as any;

      const [prevIncomeStats] = await Income.findAll({
        where: prevIncomeWhereClause,
        include: [{
          model: Shop,
          as: 'shop',
          where: shopWhereClause,
          required: true
        }],
        attributes: [
          [fn('SUM', col('amount')), 'total_income']
        ],
        raw: true
      }) as unknown as { total_income: number }[];

      // Get previous period expenses for growth calculation
      const prevExpenseWhereClause = {
        date: {
          [Op.between]: [prevDateRange.start, prevDateRange.end]
        },
        createdAt: {
          [Op.between]: [prevDateRange.start, prevDateRange.end]
        }
      } as any;

      const [prevExpenseStats] = await Expense.findAll({
        where: prevExpenseWhereClause,
        include: [{
          model: Shop,
          as: 'shop',
          where: shopWhereClause,
          required: true
        }],
        attributes: [
          [fn('SUM', col('amount')), 'total_expenses']
        ],
        raw: true
      }) as unknown as { total_expenses: number }[];

      // Get monthly trends
      const monthlyTrends = await sequelize.query(`
        WITH income_data AS (
          SELECT 
            strftime('%Y-%m', date) as month,
            SUM(amount) as income
          FROM "Incomes"
          WHERE date BETWEEN :startDate AND :endDate
          AND createdAt BETWEEN :startDate AND :endDate
          GROUP BY strftime('%Y-%m', date)
        ),
        expense_data AS (
          SELECT 
            strftime('%Y-%m', date) as month,
            SUM(amount) as expenses
          FROM "Expenses"
          WHERE date BETWEEN :startDate AND :endDate
          AND createdAt BETWEEN :startDate AND :endDate
          GROUP BY strftime('%Y-%m', date)
        ),
        all_months AS (
          SELECT month FROM income_data
          UNION
          SELECT month FROM expense_data
        )
        SELECT 
          all_months.month as name,
          COALESCE(income_data.income, 0) as income,
          COALESCE(expense_data.expenses, 0) as expenses
        FROM all_months
        LEFT JOIN income_data ON all_months.month = income_data.month
        LEFT JOIN expense_data ON all_months.month = expense_data.month
        ORDER BY name
      `, {
        replacements: { 
          startDate: dateRange.start,
          endDate: dateRange.end
        },
        type: QueryTypes.SELECT
      }) as unknown as Array<{
        name: string;
        income: number;
        expenses: number;
      }>;

      // Get expense categories
      const expenseCategories = await Expense.findAll({
        where: {
          ...dateWhereClause,
          createdAt: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        } as any,
        include: [{
          model: Shop,
          as: 'shop',
          where: shopWhereClause,
          required: true
        }, {
          model: OhadaCode,
          as: 'ohadaCode',
          required: true,
          attributes: ['name']
        }],
        attributes: [
          [col('ohadaCode.name'), 'category'],
          [fn('SUM', col('amount')), 'amount']
        ],
        group: ['ohadaCode.name'],
        raw: true
      });

      // Get top income sources
      const topIncomeSources = await Income.findAll({
        where: {
          ...dateWhereClause,
          createdAt: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        } as any,
        include: [
          {
            model: Shop,
            as: 'shop',
            where: shopWhereClause,
            required: true
          },
          {
            model: OhadaCode,
            as: 'ohadaCode',
            required: true,
            attributes: ['name']
          }
        ],
        attributes: [
          [col('ohadaCode.name'), 'source'],
          [fn('SUM', col('amount')), 'amount']
        ],
        group: ['ohadaCode.name'],
        raw: true
      });

      // Get recent transactions
      const [recentIncomes, recentExpenses] = await Promise.all([
        Income.findAll({
          where: {
            ...dateWhereClause,
            createdAt: {
              [Op.between]: [dateRange.start, dateRange.end]
            }
          } as any,
          include: [{
            model: Shop,
            as: 'shop',
            where: shopWhereClause,
            required: true
          }],
          attributes: [
            'id',
            'date',
            ['description', 'description'],
            ['amount', 'amount'],
            [literal("'income'"), 'type']
          ],
          order: [['date', 'DESC']],
          limit: 5,
          raw: true
        }),
        Expense.findAll({
          where: {
            ...dateWhereClause,
            createdAt: {
              [Op.between]: [dateRange.start, dateRange.end]
            }
          } as any,
          include: [{
            model: Shop,
            as: 'shop',
            where: shopWhereClause,
            required: true
          }],
          attributes: [
            'id',
            'date',
            ['description', 'description'],
            ['amount', 'amount'],
            [literal("'expense'"), 'type']
          ],
          order: [['date', 'DESC']],
          limit: 5,
          raw: true
        })
      ]);

      // Combine and sort recent transactions
      const allTransactions = [...recentIncomes, ...recentExpenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Add profit calculation
      const profit = (incomeStats.total_income || 0) - (expenseStats.total_expenses || 0);
      
      // Use the existing results from earlier queries:
      const prevIncomeTotal = prevIncomeStats?.total_income || 0;
      const prevExpenseTotal = prevExpenseStats?.total_expenses || 0;

      // Calculate financial health metrics
      const revenueGrowth = prevIncomeTotal > 0 
        ? ((incomeStats.total_income - prevIncomeTotal) / prevIncomeTotal) * 100
        : 0;

      const expenseGrowth = prevExpenseTotal > 0 
        ? ((expenseStats.total_expenses - prevExpenseTotal) / prevExpenseTotal) * 100
        : 0;

      const profitMargin = prevIncomeTotal > 0 
        ? (profit / incomeStats.total_income) * 100
        : 0;

      const incomeCoverage = (incomeStats.total_income || 0) / 
        (expenseStats.total_expenses || 1);

      const operatingCashFlow = (incomeStats.total_income || 0) / 
        (expenseStats.total_expenses || 1);

      // Calculate debt-to-income ratio (assuming we have debt data)
      const debtToIncome = (expenseStats.total_expenses || 0) / 
        (incomeStats.total_income || 1);

      return {
        success: true,
        data: {
          overview: {
            total_income: incomeStats.total_income,
            total_expenses: expenseStats.total_expenses,
            total_profit: profit,
            revenue_growth: revenueGrowth,
            expense_growth: expenseGrowth,
            totalOrders: incomeStats.totalOrders || 0,
            profit_margin: profitMargin,
            income_coverage: incomeCoverage,
            operating_cash_flow: operatingCashFlow,
            debt_to_income: debtToIncome
          },
          monthlyData: monthlyTrends,
          expenseCategories: expenseCategories.map(c => ({ 
            name: (c as any).category,
            value: c.amount 
          })),
          topIncomeSources: topIncomeSources.map(s => ({
            name: (s as any).source,
            value: s.amount
          })),
          recentTransactions: allTransactions
        }
      };

    } catch (error) {
      console.error('Error in finance dashboard:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch finance dashboard data'
      };
    }
  });
}

export { IPC_CHANNELS };