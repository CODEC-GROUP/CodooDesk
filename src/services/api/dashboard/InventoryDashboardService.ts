import { ipcMain } from 'electron';
import { Op, fn, col, literal } from 'sequelize';
import Inventory from '../../../models/Inventory.js';
import Product from '../../../models/Product.js';
import StockMovement from '../../../models/StockMovement.js';
import Supplier from '../../../models/Supplier.js';
import Shop from '../../../models/Shop.js';
import { createErrorResponse, createSuccessResponse } from '../../../utils/errorHandling.js';
import { sequelize } from '../../database/index.js';

const IPC_CHANNELS = {
  GET_INVENTORY_DASHBOARD: 'inventory:dashboard:get',
  GET_LOW_STOCK_ALERTS: 'dashboard:inventory:low-stock',
  GET_STOCK_MOVEMENTS_SUMMARY: 'dashboard:inventory:movements'
};

async function getWeeklyTrends(businessId: string, startDate: Date, endDate: Date) {
  const movements = await StockMovement.findAll({
    where: {
      createdAt: {
        [Op.between]: [startDate, endDate]
      },
      '$inventory.shop.businessId$': businessId
    },
    attributes: [
      [fn('DATE', col('createdAt')), 'day'],
      [fn('SUM', col('quantity')), 'count']
    ],
    include: [{
      model: Inventory,
      as: 'inventory',
      attributes: [],
      include: [{
        model: Shop,
        attributes: []
      }]
    }],
    group: [fn('DATE', col('createdAt'))],
    raw: true
  });

  return movements;
}

interface SupplierWithAggregates extends Supplier {
  value: number;
  items: number;
}

async function getTopSuppliers(businessId: string) {
  const suppliers = await Supplier.findAll({
    attributes: [
      'name',
      [fn('COUNT', col('products.id')), 'items'],
      [fn('SUM', col('products.value')), 'value']
    ],
    include: [{
      model: Product,
      as: 'products',
      attributes: [],
      where: {
        businessId
      }
    }],
    group: ['Supplier.id'],
    order: [[fn('SUM', col('products.value')), 'DESC']],
    limit: 5,
    raw: true
  }) as unknown as (Supplier & SupplierWithAggregates)[];

  return suppliers.map((supplier) => ({
    name: supplier.name,
    value: supplier.value,
    items: supplier.items,
    color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color for now
  }));
}

export function registerInventoryDashboardHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_INVENTORY_DASHBOARD, async (event, { businessId, startDate, endDate }) => {
    try {
      // Get all shops for the business
      const shops = await Shop.findAll({
        where: { businessId },
        attributes: ['id']
      });

      const shopIds = shops.map(shop => shop.id);

      // Get inventory summary
      const [summary] = await Inventory.findAll({
        attributes: [
          [fn('COUNT', col('Product.id')), 'total_products'],
          [fn('SUM', literal('Product.quantity * Product.value')), 'total_value'],
          [fn('COUNT', literal('CASE WHEN Product.quantity <= Product.reorderPoint THEN 1 END')), 'low_stock_items'],
          [fn('COUNT', literal('CASE WHEN Product.quantity = 0 THEN 1 END')), 'out_of_stock_items']
        ],
        include: [{
          model: Product,
          attributes: []
        }],
        where: {
          shopId: {
            [Op.in]: shopIds
          }
        },
        raw: true
      });

      // Define interface for shop summary
      interface ShopSummary {
        inventory_value: number;
        product_count: number;
        low_stock_count: number;
      }

      // Define interface for shop stats
      interface ShopStats {
        [key: string]: ShopSummary;
      }

      // Initialize shopStats with proper typing
      const shopStats: ShopStats = {};
      for (const shop of shops) {
        const [shopSummary] = await Inventory.findAll({
          attributes: [
            [fn('SUM', literal('Product.quantity * Product.value')), 'inventory_value'],
            [fn('COUNT', col('Product.id')), 'product_count'],
            [fn('COUNT', literal('CASE WHEN Product.quantity <= Product.reorderPoint THEN 1 END')), 'low_stock_count']
          ],
          include: [{
            model: Product,
            attributes: []
          }],
          where: {
            shopId: shop.id
          },
          raw: true
        }) as unknown as ShopSummary[];
        shopStats[shop.id] = shopSummary || { inventory_value: 0, product_count: 0, low_stock_count: 0 };
      }

      // Get trends data
      const weekly = await getWeeklyTrends(businessId, startDate, endDate);
      
      // Get daily data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const daily = await getWeeklyTrends(businessId, sevenDaysAgo, new Date());

      // Get top suppliers
      const topSuppliers = await getTopSuppliers(businessId);

      // Get value trends (comparing current year with previous year)
      const currentYear = new Date().getFullYear();
      const valueData = await StockMovement.findAll({
        attributes: [
          [fn('HOUR', col('createdAt')), 'time'],
          [fn('SUM', literal('CASE WHEN YEAR(createdAt) = ' + currentYear + ' THEN quantity * cost_per_unit END')), `${currentYear}`],
          [fn('SUM', literal('CASE WHEN YEAR(createdAt) = ' + (currentYear - 1) + ' THEN quantity * cost_per_unit END')), `${currentYear - 1}`]
        ],
        where: {
          '$inventory.shop.businessId$': businessId,
          createdAt: {
            [Op.gte]: new Date(currentYear - 1, 0, 1)
          }
        },
        include: [{
          model: Inventory,
          as: 'inventory',
          attributes: [],
          include: [{
            model: Shop,
            attributes: []
          }]
        }],
        group: [fn('HOUR', col('createdAt'))],
        raw: true
      });

      return createSuccessResponse({
        stats: {
          ...summary,
          shop_stats: shopStats
        },
        trends: {
          weekly,
          daily,
          value: valueData,
          topSuppliers
        }
      });
    } catch (error) {
      console.error('Error in inventory dashboard:', error);
      return createErrorResponse(error);
    }
  });
}

export { IPC_CHANNELS };