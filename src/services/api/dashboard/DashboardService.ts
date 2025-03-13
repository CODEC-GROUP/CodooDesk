import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { sequelize } from '../../database/index.js';
import StockMovement from '../../../models/StockMovement.js';
import InventoryItem from '../../../models/InventoryItem.js';
import Product from '../../../models/Product.js';
import Supplier from '../../../models/Supplier.js';
import Shop from '../../../models/Shop.js';
import Sales from '../../../models/Sales.js';
import { Op, fn, col, literal } from 'sequelize';
import Category from '../../../models/Category.js';
import Order from '../../../models/Order.js';
import { createErrorResponse, createSuccessResponse } from '../../../utils/errorHandling.js';

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
  GET_CATEGORY_BREAKDOWN: 'dashboard:categories:breakdown'
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
}

interface CategoryResult {
  id: string;
  name: string;
  product_count: number;
  total_items: number;
  total_value: number;
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
    raw: true
  }) as unknown as Array<{ total_products_sold: number; total_quantity_sold: number }>;

  return {
    total_products_sold: Number(inventoryStats[0]?.total_products_sold || 0),
    total_value: Number(inventoryStats[0]?.total_quantity_sold || 0)
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
  return await Product.findAll({
    include: [{
      model: Order,
      attributes: [],
      where: {
        paymentStatus: 'paid'
      }
    }, {
      model: Shop,
      where: whereClause
    }],
    attributes: [
      'id',
      'name',
      'sku',
      'featuredImage',
      'sellingPrice',
      [sequelize.fn('COUNT', sequelize.col('Orders.id')), 'orderCount'],
      [sequelize.fn('SUM', sequelize.col('Orders.quantity')), 'unitsSold'],
      [sequelize.literal('(SELECT quantity FROM InventoryItems WHERE InventoryItems.productId = Product.id LIMIT 1)'), 'currentStock']
    ],
    group: ['Product.id', 'Product.name', 'Product.sku', 'Product.featuredImage', 'Product.sellingPrice'],
    order: [[sequelize.literal('unitsSold'), 'DESC']],
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

  const results = await Sales.findAll({
    where: {
      ...dateWhereClause
    },
    include: [{
      model: Shop,
      as: 'shop',
      where: whereClause,
      required: true
    }],
    attributes: [
      [sequelize.fn('SUM', sequelize.col('netAmount')), 'total_sales'],
      [sequelize.fn('COUNT', sequelize.literal('DISTINCT Sales.id')), 'total_orders']
    ],
    raw: true
  }) as unknown as Array<{ total_sales: number; total_orders: number }>;

  return results.map(result => ({
    total_sales: Number(result.total_sales || 0),
    total_orders: Number(result.total_orders || 0)
  }));
}

async function getDailyTrends() {
  return await Sales.findAll({
    attributes: [
      [fn('strftime', '%Y-%m-%d', col('createdAt')), 'date'],
      [fn('sum', col('netAmount')), 'total_sales'],
      [fn('count', col('id')), 'transaction_count']
    ],
    group: ['date'],
    order: [['date', 'ASC']]
  });
}

async function getCategoryBreakdown(whereClause: WhereClause): Promise<CategoryResult[]> {
  const results = await Category.findAll({
    include: [{
      model: Product,
      required: true,
      where: whereClause,
      attributes: []
    }],
    attributes: [
      'id',
      'name',
      [fn('COUNT', col('Products.id')), 'product_count'],
      [fn('SUM', col('Products.quantity')), 'total_items'],
      [fn('SUM', literal('Products.quantity * Products.sellingPrice')), 'total_value']
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

function getWhereClause(params: { businessId: string; shopId?: string; shopIds?: string[] }): WhereClause {
  const { businessId, shopId, shopIds } = params;
  return shopIds?.length 
    ? { '$shop.id$': { [Op.in]: shopIds } }
    : shopId 
      ? { shopId }
      : { '$shop.businessId$': businessId };
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
      const trends = await getDailyTrends();
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
}

export { IPC_CHANNELS };