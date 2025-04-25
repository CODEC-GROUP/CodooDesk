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

async function getInventoryStats(shopIds: string[], inventoryIds: string[]): Promise<InventoryStatsResult> {
  // Ensure arrays are valid
  shopIds = shopIds || [];
  inventoryIds = inventoryIds || [];

  // Build the where clause for the inventory include
  const inventoryWhere: any = {
    shopId: {
      [Op.in]: shopIds
    }
  };
  
  // Only add the id condition if inventoryIds has items
  if (inventoryIds.length > 0) {
    inventoryWhere.id = {
      [Op.in]: inventoryIds
    };
  }

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
      where: inventoryWhere
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
async function getTotalItemsSoldFromOrders(shopIds: string[], startDate: Date, endDate: Date, inventoryIds: string[]): Promise<number> {
  // Ensure arrays are valid
  shopIds = shopIds || [];
  inventoryIds = inventoryIds || [];

  // If we have inventory IDs, we need to get the product IDs first
  let productFilter: any = {};
  
  if (inventoryIds.length > 0) {
    // Get product IDs from inventory items
    const inventoryItems = await InventoryItem.findAll({
      attributes: ['product_id'],
      where: {
        inventory_id: {
          [Op.in]: inventoryIds
        }
      },
      raw: true
    });
    
    // Extract product IDs
    const productIds = inventoryItems.map(item => item.product_id);
    
    // If we have product IDs, add them to the filter
    if (productIds.length > 0) {
      productFilter = {
        product_id: {
          [Op.in]: productIds
        }
      };
    } else {
      // If no products found in the specified inventories, return 0
      return 0;
    }
  }

  // Build the query with the product filter
  const result = await Order.findOne({
    attributes: [
      // Ensure we specify Order.quantity to avoid ambiguity if Sales also had quantity
      [fn('SUM', col('Order.quantity')), 'totalSold']
    ],
    where: productFilter, // Apply the product filter directly to the Order model
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


async function getWeeklyTrends(businessId: string, startDate: Date, endDate: Date, inventoryIds: string[]) {
  // Ensure inventoryIds is an array
  inventoryIds = inventoryIds || [];

  // Build where clauses that conditionally include inventoryIds
  const stockMovementWhere: any = {
    createdAt: {
      [Op.between]: [startDate, endDate]
    },
    '$inventoryItem.inventory.shop.businessId$': businessId
  };

  // Only add inventory_id condition if inventoryIds has items
  if (inventoryIds.length > 0) {
    stockMovementWhere['$inventoryItem.inventory_id$'] = {
      [Op.in]: inventoryIds
    };
  }

  // Get stock movement data (in/out)
  const movements = await StockMovement.findAll({
    where: stockMovementWhere,
    attributes: [
      [fn('DATE', col('StockMovement.createdAt')), 'day'],
      [fn('SUM', col('StockMovement.quantity')), 'movement'],
      [literal('CASE WHEN StockMovement.direction = "inbound" THEN SUM(StockMovement.quantity) ELSE 0 END'), 'stockIn'],
      [literal('CASE WHEN StockMovement.direction = "outbound" THEN SUM(StockMovement.quantity) ELSE 0 END'), 'stockOut']
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
    group: [fn('DATE', col('StockMovement.createdAt')), 'StockMovement.direction'],
    raw: true
  });

  // Build where clause for inventory items
  const inventoryItemWhere: any = {
    updatedAt: {
      [Op.between]: [startDate, endDate]
    }
  };

  // Only add inventory_id condition if inventoryIds has items
  if (inventoryIds.length > 0) {
    inventoryItemWhere.inventory_id = {
      [Op.in]: inventoryIds
    };
  }

  // Get daily stock levels
  const stockLevels = await InventoryItem.findAll({
    attributes: [
      [fn('DATE', col('InventoryItem.updatedAt')), 'day'],
      [fn('SUM', col('InventoryItem.quantity')), 'stockLevel']
    ],
    include: [{
      model: Inventory,
      as: 'inventory',
      attributes: [],
      include: [{
        model: Shop,
        as: 'shop',
        where: {
          businessId
        },
        attributes: []
      }]
    }],
    where: inventoryItemWhere,
    group: [fn('DATE', col('InventoryItem.updatedAt'))],
    raw: true
  });

  // Get daily sales data for turnover calculation
  const sales = await Order.findAll({
    attributes: [
      [fn('DATE', col('sale.createdAt')), 'day'],
      [fn('SUM', col('Order.quantity')), 'quantitySold']
    ],
    include: [{
      model: Sales,
      as: 'sale',
      attributes: [],
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        '$sale.shop.businessId$': businessId
      },
      include: [{
        model: Shop,
        as: 'shop',
        attributes: []
      }]
    }],
    group: [fn('DATE', col('sale.createdAt'))],
    raw: true
  });

  // Get total inventory at beginning of period for turnover calculations
  const [initialInventory] = await InventoryItem.findAll({
    attributes: [
      [fn('SUM', col('InventoryItem.quantity')), 'totalQuantity']
    ],
    include: [{
      model: Inventory,
      as: 'inventory',
      attributes: [],
      include: [{
        model: Shop,
        as: 'shop',
        where: {
          businessId
        },
        attributes: []
      }]
    }],
    where: {
      updatedAt: {
        [Op.lt]: startDate
      },
      inventory_id: {
        [Op.in]: inventoryIds
      }
    },
    raw: true
  }) as any[];

  const initialStock = Number(initialInventory?.totalQuantity) || 0;

  // Combine all data by date
  const dateMap = new Map();
  
  // Process all dates in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dateMap.set(dateStr, {
      day: dateStr,
      stockLevel: 0,
      stockIn: 0,
      stockOut: 0,
      quantitySold: 0,
      turnoverRate: 0,
      daysOfInventory: 0
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Add stock levels
  stockLevels.forEach((item: any) => {
    const day = item.day;
    if (dateMap.has(day)) {
      const data = dateMap.get(day);
      data.stockLevel = Number(item.stockLevel) || 0;
      dateMap.set(day, data);
    }
  });

  // Add stock movements
  movements.forEach((item: any) => {
    const day = item.day;
    if (dateMap.has(day)) {
      const data = dateMap.get(day);
      data.stockIn = Number(item.stockIn) || 0;
      data.stockOut = Number(item.stockOut) || 0;
      dateMap.set(day, data);
    }
  });

  // Add sales data and calculate metrics
  sales.forEach((item: any) => {
    const day = item.day;
    if (dateMap.has(day)) {
      const data = dateMap.get(day);
      data.quantitySold = Number(item.quantitySold) || 0;
      
      // Calculate turnover rate (daily sales / average inventory)
      const averageInventory = (initialStock + data.stockLevel) / 2;
      data.turnoverRate = averageInventory > 0 ? (data.quantitySold / averageInventory) * 100 : 0;
      
      // Calculate days of inventory (average inventory / daily sales)
      data.daysOfInventory = data.quantitySold > 0 ? averageInventory / data.quantitySold : 0;
      
      dateMap.set(day, data);
    }
  });

  // Convert map to array and sort by date
  return Array.from(dateMap.values()).sort((a, b) => 
    new Date(a.day).getTime() - new Date(b.day).getTime()
  );
}

async function getTopProducts(shopIds: string[], limit = 5, inventoryIds: string[]) {
  // Ensure arrays are valid
  shopIds = shopIds || [];
  inventoryIds = inventoryIds || [];

  // Build the where clause for the inventory include
  const inventoryWhere: any = {
    shopId: {
      [Op.in]: shopIds
    }
  };
  
  // Only add the id condition if inventoryIds has items
  if (inventoryIds.length > 0) {
    inventoryWhere.id = {
      [Op.in]: inventoryIds
    };
  }

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
      where: inventoryWhere
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

async function getTopSuppliers(businessId: string, inventoryIds: string[]) {
  // Ensure inventoryIds is an array
  inventoryIds = inventoryIds || [];

  // First, if we have inventory IDs, get the product IDs from those inventory items
  let productFilter: any = {};
  
  if (inventoryIds.length > 0) {
    // Get product IDs from inventory items
    const inventoryItems = await InventoryItem.findAll({
      attributes: ['product_id'],
      where: {
        inventory_id: {
          [Op.in]: inventoryIds
        }
      },
      raw: true
    });
    
    // Extract product IDs
    const productIds = inventoryItems.map(item => item.product_id);
    
    // If we have product IDs, add them to the filter
    if (productIds.length > 0) {
      productFilter = {
        id: {
          [Op.in]: productIds
        }
      };
    } else {
      // If no products found in the specified inventories, return empty array
      return [];
    }
  }

  // Get suppliers with their inventory items
  const suppliers = await Supplier.findAll({
    where: {
      businessId
    },
    attributes: [
      'id',
      'name',
      [literal('COUNT(DISTINCT `inventoryItems`.`product_id`)'), 'items'],
      [literal('SUM(`inventoryItems`.`cost_price` * `inventoryItems`.`quantity_supplied`)'), 'value']
    ],
    include: [{
      model: InventoryItem,
      as: 'inventoryItems',
      attributes: [],
      required: true,
      include: [{
        model: Product,
        as: 'product',
        attributes: [],
        where: productFilter
      }]
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
  ipcMain.handle(IPC_CHANNELS.GET_INVENTORY_DASHBOARD, async (event, { businessId, shopIds, inventoryIds, dateRange, view }) => {
    try {
      // If no shopIds provided, get all shops for the business
      if (!shopIds?.length) {
        const shops = await Shop.findAll({
          where: { businessId },
          attributes: ['id']
        });
        shopIds = shops.map(shop => shop.id);
      }

      // Ensure inventoryIds is always an array
      if (!inventoryIds || !Array.isArray(inventoryIds)) {
        inventoryIds = [];
      }

      // If no inventoryIds provided, get all inventories for the shops
      if (inventoryIds.length === 0 && shopIds.length > 0) {
        const inventories = await Inventory.findAll({
          where: {
            shopId: {
              [Op.in]: shopIds
            }
          },
          attributes: ['id']
        });
        inventoryIds = inventories.map(inventory => inventory.id);
        console.log(`Fetched ${inventoryIds.length} inventories for shops:`, shopIds);
      }

      // Get inventory summary
      const summary = await getInventoryStats(shopIds, inventoryIds);

      // Get shop-specific stats
      const shopStats: Record<string, typeof summary> = {};
      for (const shopId of shopIds) {
        const shopSummary = await getInventoryStats([shopId], inventoryIds);
        shopStats[shopId] = shopSummary;
      }

      // Get trends data based on view type
      const startDate = dateRange?.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

      const trends = await getWeeklyTrends(businessId, startDate, endDate, inventoryIds);
      const topProducts = await getTopProducts(shopIds, 5, inventoryIds);
      const topSuppliers = await getTopSuppliers(businessId, inventoryIds);
      const categoryBreakdown = await getCategoryBreakdown(shopIds, inventoryIds);
      const itemsSold = await getTotalItemsSoldFromOrders(shopIds, startDate, endDate, inventoryIds); // <-- Use the new function
      
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

async function getCategoryBreakdown(shopIds: string[], inventoryIds: string[]) {
  // Ensure arrays are valid
  shopIds = shopIds || [];
  inventoryIds = inventoryIds || [];

  // Build the where clause for the inventory include
  const inventoryWhere: any = {
    shopId: {
      [Op.in]: shopIds
    }
  };
  
  // Only add the id condition if inventoryIds has items
  if (inventoryIds.length > 0) {
    inventoryWhere.id = {
      [Op.in]: inventoryIds
    };
  }

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
      where: inventoryWhere
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
