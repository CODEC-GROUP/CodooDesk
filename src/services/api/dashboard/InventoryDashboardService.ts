import { ipcMain } from 'electron';
import { Op, fn, col, literal } from 'sequelize';
import Inventory from '../../../models/Inventory.js';
import InventoryItem from '../../../models/InventoryItem.js';
import Product from '../../../models/Product.js';
import StockMovement from '../../../models/StockMovement.js';
import Supplier from '../../../models/Supplier.js';
import Shop from '../../../models/Shop.js';
import { createErrorResponse, createSuccessResponse } from '../../../utils/errorHandling.js';
import { sequelize } from '../../database/index.js';
import Category from '../../../models/Category.js';
import Order from '../../../models/Order.js'; // <-- Import Order model
import Sales from '../../../models/Sales.js'; // <-- Import Sales model

const IPC_CHANNELS = {
  GET_INVENTORY_DASHBOARD: 'dashboard:inventory:get',
  GET_LOW_STOCK_ALERTS: 'inventory:detailed:low-stock',
  GET_STOCK_MOVEMENTS_SUMMARY: 'inventory:detailed:movements'
};

// Define the return type for getInventoryStats
interface InventoryStatsResult {
  total_products: number;
  inventoryValue: number; // Based on selling_price
  low_stock_items: number;
  out_of_stock_items: number;
}

async function getInventoryStats(shopIds: string[]): Promise<InventoryStatsResult> {
  const result = await InventoryItem.findAll({
    attributes: [
      [fn('COUNT', col('product_id')), 'total_products'],
      // Calculate inventory value based on selling price
      [fn('SUM', literal('quantity * selling_price')), 'inventoryValue'],
      [fn('COUNT', literal('CASE WHEN quantity <= reorder_point THEN 1 END')), 'low_stock_items'],
      [fn('COUNT', literal('CASE WHEN quantity = 0 THEN 1 END')), 'out_of_stock_items']
    ],
    include: [{
      model: Inventory,
      as: 'inventory',
      attributes: [],
      where: {
        shopId: {
          [Op.in]: shopIds
        }
      }
    }],
    raw: true
  });

  // Adjust the return object keys and cast types
  const stats = result[0] as any || {};
  return {
    total_products: Number(stats.total_products) || 0,
    inventoryValue: Number(stats.inventoryValue) || 0,
    low_stock_items: Number(stats.low_stock_items) || 0,
    out_of_stock_items: Number(stats.out_of_stock_items) || 0
  };
}

// Function to calculate total items sold based on Orders
async function getTotalItemsSoldFromOrders(shopIds: string[], startDate: Date, endDate: Date): Promise<number> {
  const result = await Order.findOne({
    attributes: [
      // Ensure we specify Order.quantity to avoid ambiguity if Sales also had quantity
      [fn('SUM', col('Order.quantity')), 'totalSold']
    ],
    include: [{
      model: Sales,
      as: 'sale',
      attributes: [], // No attributes needed from Sales itself
      required: true, // Ensure join
      where: {
        shopId: { // Filter by shopId on the Sales model
          [Op.in]: shopIds
        },
        createdAt: { // Filter by date using createdAt on the Sales model
          [Op.between]: [startDate, endDate]
        }
      }
    }],
    raw: true
  });

  // The result might look like { totalSold: '123.0' } or null
  return Number((result as any)?.totalSold) || 0;
}


async function getWeeklyTrends(businessId: string, startDate: Date, endDate: Date) {
  // Note: This trend calculation might also be affected by ambiguous 'quantity' if StockMovement has quantity.
  // Consider specifying `StockMovement.quantity` if errors occur here later.
  const movements = await StockMovement.findAll({
    where: {
      createdAt: {
        [Op.between]: [startDate, endDate]
      },
      '$inventoryItem.inventory.shop.businessId$': businessId
    },
    attributes: [
      [fn('DATE', col('StockMovement.createdAt')), 'day'],
      [fn('SUM', col('StockMovement.quantity')), 'count']
    ],
    include: [{
      model: InventoryItem,
      as: 'inventoryItem',
      attributes: [],
      include: [{
        model: Inventory,
        as: 'inventory',
        attributes: [],
        include: [{
          model: Shop,
          as: 'shop',
          attributes: []
        }]
      }]
    }],
    group: [fn('DATE', col('StockMovement.createdAt'))],
    raw: true
  });

  return movements;
}

async function getTopProducts(shopIds: string[], limit = 5) {
  return await InventoryItem.findAll({
    attributes: [
      'id',
      'quantity',
      'reorder_point',
      'value',
      [literal('`InventoryItem`.`quantity` * `InventoryItem`.`unit_cost`'), 'total_value']
    ],
    include: [{
      model: Product,
      as: 'product',
      attributes: ['name', 'featuredImage']
    }, {
      model: Inventory,
      as: 'inventory',
      attributes: [],
      where: {
        shopId: {
          [Op.in]: shopIds
        }
      }
    }],
    order: [[literal('total_value'), 'DESC']],
    limit,
    raw: true,
    nest: true
  });
}

interface SupplierWithAggregates extends Supplier {
  value: number;
  items: number;
}

async function getTopSuppliers(businessId: string) {
  const suppliers = await Supplier.findAll({
    where: {
      businessId
    },
    attributes: [
      'id',
      'name',
      [literal('COUNT(DISTINCT `supplierProducts`.`id`)'), 'items'],
      [literal('SUM(`supplierProducts`.`purchasePrice`)'), 'value']
    ],
    include: [{
      model: Product,
      as: 'supplierProducts',
      attributes: [],
      required: true,
      through: {
        attributes: []
      }
    }],
    group: ['Supplier.id', 'Supplier.name'],
    order: [[literal('value'), 'DESC']],
    limit: 5,
    subQuery: false,
    raw: true
  }) as unknown as (Supplier & SupplierWithAggregates)[];

  return suppliers.map((supplier) => ({
    name: supplier.name,
    value: Number(supplier.value) || 0,
    items: Number(supplier.items) || 0,
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  }));
}
// Add this interface near the top
interface InventoryWithCategory extends Inventory {
  percentage: number;
  total_value: number;
  name: string;
}

// Add near other interfaces
interface CategoryBreakdownResult {
  total_value: number;
  percentage: number;
  product: {
    category: {
      name: string;
    };
  };
}

export function registerInventoryDashboardHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_INVENTORY_DASHBOARD, async (event, { businessId, shopIds, dateRange, view }) => {
    try {
      // If no shopIds provided, get all shops for the business
      if (!shopIds?.length) {
        const shops = await Shop.findAll({
          where: { businessId },
          attributes: ['id']
        });
        shopIds = shops.map(shop => shop.id);
      }

      // Get inventory summary
      const summary = await getInventoryStats(shopIds);

      // Get shop-specific stats
      const shopStats: Record<string, typeof summary> = {};
      for (const shopId of shopIds) {
        const shopSummary = await getInventoryStats([shopId]);
        shopStats[shopId] = shopSummary;
      }

      // Get trends data based on view type
      const startDate = dateRange?.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

      const trends = await getWeeklyTrends(businessId, startDate, endDate);
      const topProducts = await getTopProducts(shopIds);
      const topSuppliers = await getTopSuppliers(businessId);
      const categoryBreakdown = await getCategoryBreakdown(shopIds);
      const itemsSold = await getTotalItemsSoldFromOrders(shopIds, startDate, endDate); // <-- Use the new function
      
      // Reset inventoryValueChange calculation for now
      const inventoryValueChange = 0; // Placeholder - Accurate calculation needs historical data/logic

      return createSuccessResponse({
        stats: {
          total_products: summary.total_products,
          inventoryValue: summary.inventoryValue,
          low_stock_items: summary.low_stock_items,
          out_of_stock_items: summary.out_of_stock_items,
          itemsSold: itemsSold, // Use calculated value
          inventoryValueChange: inventoryValueChange,
          shop_stats: shopStats,
          category_composition: categoryBreakdown
        },
        trends: {
          data: trends,
          topProducts,
          topSuppliers
        }
      });
    } catch (error) {
      console.error('Error in inventory dashboard:', error);
      return createErrorResponse(error);
    }
  });
}

async function getCategoryBreakdown(shopIds: string[]) {
  const categoryBreakdown = await InventoryItem.findAll({
    attributes: [
      [fn('SUM', literal('`InventoryItem`.`quantity` * `InventoryItem`.`unit_cost`')), 'total_value'],
      [literal('ROUND((SUM(`InventoryItem`.`quantity` * `InventoryItem`.`unit_cost`) / (SELECT SUM(`quantity` * `unit_cost`) FROM `InventoryItems`)) * 100, 1)'), 'percentage']
    ],
    include: [{
      model: Product,
      as: 'product',
      attributes: [],
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name'],
        required: true
      }]
    }, {
      model: Inventory,
      as: 'inventory',
      attributes: [],
      where: {
        shopId: {
          [Op.in]: shopIds
        }
      }
    }],
    group: ['product.category.id', 'product.category.name'],
    raw: true,
    nest: true
  }) as unknown as CategoryBreakdownResult[];

  return categoryBreakdown.map((cat, index) => ({
    name: cat.product?.category?.name || 'Uncategorized',
    percentage: cat.percentage,
    value: cat.total_value,
    color: `hsl(${(index * 360) / categoryBreakdown.length}, 70%, 50%)`
  }));
}

export { IPC_CHANNELS };
