import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { sequelize } from '../../database/index.js';
import StockMovement from '../../../models/StockMovement.js';
import InventoryItem from '../../../models/InventoryItem.js';
import Product from '../../../models/Product.js';
import Supplier from '../../../models/Supplier.js';
import Shop from '../../../models/Shop.js';
import Sales from '../../../models/Sales.js';
import Customer from '../../../models/Customer.js'; // Import Customer model
import { Op, fn, col, literal } from 'sequelize';
import Category from '../../../models/Category.js';
import Order from '../../../models/Order.js';
import { createErrorResponse, createSuccessResponse } from '../../../utils/errorHandling.js';
import Income from '../../../models/Income.js';
import Expense from '../../../models/Expense.js';

const IPC_CHANNELS = {
  // Inventory Dashboard
  GET_INVENTORY_STATS: 'dashboard:inventory:stats',
  GET_INVENTORY_MOVEMENTS: 'dashboard:inventory:movements',
  GET_TOP_SUPPLIERS: 'dashboard:inventory:suppliers',
  GET_TOP_PRODUCTS: 'dashboard:inventory:products',
  
  // Sales Dashboard
  GET_SALES_STATS: 'dashboard:sales:stats',
  GET_SALES_TRENDS: 'dashboard:sales:trends',
  
  // Categories
  GET_CATEGORY_BREAKDOWN: 'dashboard:categories:breakdown',
  GET_TOP_CATEGORIES_BY_PRODUCT_COUNT: 'dashboard:categories:topByProductCount', // New channel

  // Customers
  GET_TOP_CUSTOMERS: 'dashboard:customers:top',

  // Finance Time Series
  GET_FINANCE_TIME_SERIES: 'dashboard:finance:timeSeries'
};

interface WhereClause {
  [key: string]: any;
}

interface InventoryStatsResult {
  total_products_sold: number;
  total_value: number;
}

interface SalesStatsResult {
  total_orders: number;
  total_sales: number;
  total_revenue: number;
  total_expenses: number;
}

interface CategoryResult {
  id: string;
  name: string;
  product_count: number;
  total_items: number;
  total_value: number;
  percentage: number; // Added percentage for breakdown
  color: string; // Added color for breakdown chart
}

// New interface for top categories by product count
interface TopCategoryResult {
  id: string;
  name: string;
  product_count: number;
}

interface TrendResult {
  date: string;
  total_sales: number;
  transaction_count: number;
}

interface IncomeTimeSeriesResult {
  date: string;
  income: number;
}

interface ExpenseTimeSeriesResult {
  date: string;
  expenses: number;
}

async function getInventoryStats(whereClause: WhereClause): Promise<InventoryStatsResult> {
  const inventoryStats = await Product.findAll({
    include: [{
      model: Order,
      as: 'orders',
      required: false,
      where: {
        paymentStatus: 'paid'
      },
      attributes: []
    }, {
      model: Shop,
      required: true,
      where: whereClause
    }],
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('orders.id')), 'total_products_sold'],
      [sequelize.fn('SUM', sequelize.col('orders.quantity')), 'total_quantity_sold']
    ],
    group: ['Product.id'],
    raw: true
  });

  const totalOrders = inventoryStats.length;

  return {
    total_products_sold: totalOrders,
    total_value: inventoryStats.reduce((sum, stat: any) => sum + Number(stat.total_quantity_sold || 0), 0)
  };
}

async function getDailyMovements(sevenDaysAgo: Date, shopId?: string) {
  return await StockMovement.findAll({
    where: {
      createdAt: {
        [Op.gte]: sevenDaysAgo
      },
      ...(shopId && { source_inventory_id: shopId })
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN direction = "inbound" THEN quantity ELSE -quantity END')), 'net_change']
    ],
    group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
    order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
    raw: true
  });
}

async function getTopSuppliers(whereClause: WhereClause) {
  return await Supplier.findAll({
    include: [{
      model: InventoryItem,
      attributes: [],
      include: [{
        model: Product,
        attributes: [],
        include: [{
          model: Shop,
          where: whereClause
        }]
      }]
    }],
    attributes: [
      'id',
      'name',
      [sequelize.fn('COUNT', sequelize.col('InventoryItems.id')), 'items'],
      [sequelize.fn('SUM', sequelize.literal('InventoryItems.quantity * InventoryItems.unit_cost')), 'value']
    ],
    group: ['Supplier.id', 'Supplier.name'],
    order: [[sequelize.literal('value'), 'DESC']],
    limit: 5,
    raw: true
  });
}

async function getTopProducts(whereClause: WhereClause) {
  // Create a shop-specific where clause
  let shopWhere: WhereClause = {};
  
  if (whereClause.shopId) {
    shopWhere.id = whereClause.shopId;
  } else if (whereClause['$shop.businessId$']) {
    shopWhere.businessId = whereClause['$shop.businessId$'];
  }

  // Get products with their order counts
  return await Product.findAll({
    include: [{
      model: Shop,
      as: 'shop',
      where: shopWhere,
      required: true
    }],
    attributes: [
      'id',
      'name',
      'sku',
      'featuredImage',
      'sellingPrice',
      'quantity',
      [sequelize.fn('COUNT', sequelize.col('Product.id')), 'orderCount'],
      [sequelize.literal('(SELECT SUM(quantity) FROM Orders WHERE Orders.product_id = Product.id AND Orders.paymentStatus = "paid")'), 'unitsSold']
    ],
    group: ['Product.id'],
    order: [[sequelize.literal('orderCount'), 'DESC']],
    limit: 10,
    raw: true
  });
}

async function getSalesStats(whereClause: WhereClause, dateRange?: { start: string; end: string }): Promise<SalesStatsResult[]> {
  const dateWhereClause = dateRange ? {
    createdAt: {
      [Op.between]: [dateRange.start, dateRange.end]
    }
  } : {};

  // Get revenue from Income
  const revenueResult = await Income.findOne({
    where: {
      ...dateWhereClause,
    },
    include: [{
      model: Shop,
      as: 'shop',
      where: whereClause,
      required: true
    }],
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
    ],
    raw: true
  }) as unknown as { total_revenue: number } | null;

  // Get expenses
  const expenseResult = await Expense.findOne({
    where: {
      ...dateWhereClause,
    },
    include: [{
      model: Shop,
      as: 'shop',
      where: whereClause,
      required: true
    }],
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_expenses']
    ],
    raw: true
  }) as unknown as { total_expenses: number } | null;

  // Get sales data
  const results = await Sales.findAll({
    where: {
      ...dateWhereClause,
      status: 'completed'
    },
    include: [{
      model: Shop,
      as: 'shop',
      where: whereClause,
      required: true
    }, {
      model: Order,
      as: 'orders',
      required: false,
      attributes: []
    }],
    attributes: [
      [sequelize.fn('SUM', sequelize.col('netAmount')), 'total_sales'],
      [sequelize.fn('COUNT', sequelize.col('orders.product_id')), 'total_orders']
    ],
    raw: true
  }) as unknown as Array<{ total_sales: number; total_orders: number }>;

  return results.map(result => ({
    total_revenue: Number(revenueResult?.total_revenue || 0),
    total_expenses: Number(expenseResult?.total_expenses || 0),
    total_sales: Number(result.total_sales || 0),
    total_orders: Number(result.total_orders || 0)
  }));
}

async function getTrends() {
  const results = await Sales.findAll({
    where: {
      status: 'completed'
    },
    attributes: [
      [fn('strftime', '%Y-%m-%d', col('createdAt')), 'date'],
      [fn('sum', col('netAmount')), 'total_sales'],
      [fn('count', col('id')), 'transaction_count']
    ],
    group: ['date'],
    order: [['date', 'ASC']],
    raw: true
  }) as unknown as TrendResult[];

  // Map the results to plain objects with the correct structure
  return results.map(result => ({
    date: result.date,
    total_sales: Number(result.total_sales || 0),
    transaction_count: Number(result.transaction_count || 0)
  }));
}

async function getCategoryBreakdown(whereClause: WhereClause): Promise<CategoryResult[]> {
  // Create a proper where clause based on what's provided
  let productWhere: WhereClause = {};
  let includeOptions = [];

  if (whereClause.shopId) {
    // If we have a direct shopId, use shop_id field on Product
    productWhere.shop_id = whereClause.shopId;
  } else if (whereClause['$shop.businessId$']) {
    // If we're filtering by businessId, we need to include the Shop model
    includeOptions.push({
      model: Shop,
      as: 'shop',
      where: { businessId: whereClause['$shop.businessId$'] },
      required: true,
      attributes: []
    });
  }

  const results = await Category.findAll({
    include: [{
      model: Product,
      as: 'products',
      required: true,
      where: productWhere,
      include: includeOptions,
      attributes: []
    }],
    attributes: [
      'id',
      'name',
      [fn('COUNT', col('products.id')), 'product_count'],
      [fn('SUM', col('products.quantity')), 'total_items'],
      [fn('SUM', literal('products.quantity * products.sellingPrice')), 'total_value']
    ],
    group: ['Category.id'],
    raw: true
  }) as unknown as Array<{
    id: string;
    name: string;
    product_count: number;
    total_items: number;
    total_value: number;
  }>;

  const totalValue = results.reduce((sum, cat) => sum + Number(cat.total_value), 0);

  return results.map((category, index) => ({
    id: category.id,
    name: category.name,
    product_count: Number(category.product_count),
    total_items: Number(category.total_items),
    total_value: Number(category.total_value),
    percentage: totalValue ? (Number(category.total_value) / totalValue) * 100 : 0,
    color: `hsl(${(index * 360) / results.length}, 70%, 50%)`
  }));
}

// New function to get top categories by product count
async function getTopCategoriesByProductCount(whereClause: WhereClause, limit: number = 5): Promise<TopCategoryResult[]> {
  // Create a proper where clause based on what's provided
  let productWhere: WhereClause = {};
  let includeOptions = [];

  if (whereClause.shopId) {
    // If we have a direct shopId, use shop_id field on Product
    productWhere.shop_id = whereClause.shopId;
  } else if (whereClause['$shop.businessId$']) {
    // If we're filtering by businessId, we need to include the Shop model
    includeOptions.push({
      model: Shop,
      as: 'shop',
      where: { businessId: whereClause['$shop.businessId$'] },
      required: true,
      attributes: []
    });
  }

  const results = await Category.findAll({
    include: [{
      model: Product,
      as: 'products',
      required: true,
      where: productWhere,
      include: includeOptions,
      attributes: []
    }],
    attributes: [
      'id',
      'name',
      [fn('COUNT', col('products.id')), 'product_count']
    ],
    group: ['Category.id', 'Category.name'],
    order: [[literal('product_count'), 'DESC']],
    limit: limit,
    raw: true
  }) as unknown as TopCategoryResult[];

  // Ensure product_count is a number
  return results.map(cat => ({
    ...cat,
    product_count: Number(cat.product_count)
  }));
}


async function getTopCustomers(whereClause: WhereClause) {
  // Create a shop-specific where clause
  let shopWhere: WhereClause = {};
  
  if (whereClause.shopId) {
    shopWhere.id = whereClause.shopId;
  } else if (whereClause['$shop.businessId$']) {
    shopWhere.businessId = whereClause['$shop.businessId$'];
  }

  // Query directly from Sales to get top customers
  return await Sales.findAll({
    where: {
      status: 'completed' // Only include completed sales
    },
    include: [{
      model: Shop,
      as: 'shop',
      where: shopWhere,
      required: true
    }],
    attributes: [
      'customer_id',
      [sequelize.fn('MAX', sequelize.col('Sales.createdAt')), 'last_purchase'],
      [sequelize.fn('COUNT', sequelize.col('Sales.id')), 'orderCount'],
      [sequelize.fn('SUM', sequelize.col('Sales.netAmount')), 'totalSpent']
    ],
    group: ['Sales.customer_id'],
    order: [[sequelize.literal('totalSpent'), 'DESC']],
    limit: 10,
    raw: true
  });
}

async function getFinanceTimeSeries(whereClause: WhereClause, dateRange?: { start: string; end: string }) {
  const dateWhereClause = dateRange ? {
    '$Income.createdAt$': {
      [Op.between]: [dateRange.start, dateRange.end]
    }
  } : {};

  console.log('=== Finance Time Series Debug ===');
  console.log('Input Parameters:', {
    whereClause,
    dateRange,
    dateWhereClause
  });

  try {
    // Get income time series
    const incomeSeries = await Income.findAll({
      where: {
        ...dateWhereClause,
      },
      include: [{
        model: Shop,
        as: 'shop',
        where: whereClause,
        required: true
      }],
      attributes: [
        [fn('strftime', '%Y-%m-%d', col('Income.createdAt')), 'date'],
        [fn('SUM', col('Income.amount')), 'income']
      ],
      group: [fn('strftime', '%Y-%m-%d', col('Income.createdAt'))],
      order: [[fn('strftime', '%Y-%m-%d', col('Income.createdAt')), 'ASC']],
      raw: true
    }) as unknown as IncomeTimeSeriesResult[];

    console.log('Income Query Result:', {
      count: incomeSeries.length,
      data: incomeSeries,
      sql: Income.findAll.toString()
    });

    // Get expense time series with different dateWhereClause
    const expenseDateWhereClause = dateRange ? {
      '$Expense.createdAt$': {
        [Op.between]: [dateRange.start, dateRange.end]
      }
    } : {};

    const expenseSeries = await Expense.findAll({
      where: {
        ...expenseDateWhereClause,
      },
      include: [{
        model: Shop,
        as: 'shop',
        where: whereClause,
        required: true
      }],
      attributes: [
        [fn('strftime', '%Y-%m-%d', col('Expense.createdAt')), 'date'],
        [fn('SUM', col('Expense.amount')), 'expenses']
      ],
      group: [fn('strftime', '%Y-%m-%d', col('Expense.createdAt'))],
      order: [[fn('strftime', '%Y-%m-%d', col('Expense.createdAt')), 'ASC']],
      raw: true
    }) as unknown as ExpenseTimeSeriesResult[];

    console.log('Expense Query Result:', {
      count: expenseSeries.length,
      data: expenseSeries,
      sql: Expense.findAll.toString()
    });

    // Merge the series by date
    const dateMap = new Map();
    
    // Add income data
    incomeSeries.forEach(item => {
      const date = item.date;
      const income = Number(item.income) || 0;
      console.log('Processing income:', { date, income });
      dateMap.set(date, {
        date,
        income,
        expenses: 0
      });
    });

    // Add expense data
    expenseSeries.forEach(item => {
      const date = item.date;
      const expenses = Number(item.expenses) || 0;
      console.log('Processing expense:', { date, expenses });
      if (dateMap.has(date)) {
        dateMap.get(date).expenses = expenses;
      } else {
        dateMap.set(date, {
          date,
          income: 0,
          expenses
        });
      }
    });

    // Convert map to array and sort by date
    const result = Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    console.log('Final Result:', {
      count: result.length,
      data: result
    });

    return result;
  } catch (error) {
    console.error('Error in getFinanceTimeSeries:', error);
    throw error;
  }
}

function getWhereClause(params: { businessId: string; shopId?: string; shopIds?: string[] }): WhereClause {
  const { businessId, shopId, shopIds } = params;

  // Prioritize shopId if provided for direct filtering where possible
  if (shopId) {
    return { shopId: shopId };
  }
  // Handle multiple shopIds if needed (adjust based on specific query needs)
  if (shopIds?.length) {
    // Example: For queries joining with Shop model directly
    // return { '$shop.id$': { [Op.in]: shopIds } };
    // Example: For queries filtering Product model directly
    return { shop_id: { [Op.in]: shopIds } };
  }
  // Fallback to businessId filtering via Shop association
  if (businessId) {
    return { '$shop.businessId$': businessId };
  }
  // Return empty if no identifiers provided (should ideally not happen)
  return {};
}


export function registerDashboardHandlers() {
  // Inventory Dashboard Handlers
  ipcMain.handle(IPC_CHANNELS.GET_INVENTORY_STATS, async (event, params) => {
    try {
      const whereClause = getWhereClause(params);
      const stats = await getInventoryStats(whereClause);
      return createSuccessResponse(stats);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_INVENTORY_MOVEMENTS, async (event, { shopId }) => {
    try {
      const movements = await getDailyMovements(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), shopId);
      return createSuccessResponse(movements);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_TOP_SUPPLIERS, async (event, params) => {
    try {
      const whereClause = getWhereClause(params);
      const suppliers = await getTopSuppliers(whereClause);
      return createSuccessResponse(suppliers);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_TOP_PRODUCTS, async (event, params) => {
    try {
      const whereClause = getWhereClause(params);
      const products = await getTopProducts(whereClause);
      return createSuccessResponse(products);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // Sales Dashboard Handlers
  ipcMain.handle(IPC_CHANNELS.GET_SALES_STATS, async (event, params) => {
    try {
      const { dateRange, ...restParams } = params;
      const whereClause = getWhereClause(restParams);
      const stats = await getSalesStats(whereClause, dateRange);
      return createSuccessResponse(stats);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_SALES_TRENDS, async (event) => {
    try {
      const trends = await getTrends();
      console.log(trends);
      return createSuccessResponse(trends);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // Category Dashboard Handler
  ipcMain.handle(IPC_CHANNELS.GET_CATEGORY_BREAKDOWN, async (event, params) => {
    try {
      const whereClause = getWhereClause(params);
      const breakdown = await getCategoryBreakdown(whereClause);
      return createSuccessResponse(breakdown);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // New handler for top categories by product count
  ipcMain.handle(IPC_CHANNELS.GET_TOP_CATEGORIES_BY_PRODUCT_COUNT, async (event, params) => {
    try {
      const whereClause = getWhereClause(params);
      const topCategories = await getTopCategoriesByProductCount(whereClause); // Default limit is 5
      return createSuccessResponse(topCategories);
    } catch (error) {
      return createErrorResponse(error);
    }
  });


  // Customers Dashboard Handler
  ipcMain.handle(IPC_CHANNELS.GET_TOP_CUSTOMERS, async (event, params) => {
    try {
      const whereClause = getWhereClause(params);
      const customers = await getTopCustomers(whereClause);
      return createSuccessResponse(customers);
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // Finance Time Series Handler
  ipcMain.handle(IPC_CHANNELS.GET_FINANCE_TIME_SERIES, async (event, params) => {
    try {
      const { dateRange, ...restParams } = params;
      const whereClause = getWhereClause(restParams);
      const timeSeries = await getFinanceTimeSeries(whereClause, dateRange);
      return createSuccessResponse(timeSeries);
    } catch (error) {
      return createErrorResponse(error);
    }
  });
}

export { IPC_CHANNELS };
