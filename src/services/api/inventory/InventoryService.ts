import { ipcMain, IpcMainInvokeEvent } from 'electron';
import Inventory from '../../../models/Inventory.js';
import InventoryItem from '../../../models/InventoryItem.js';
import Product from '../../../models/Product.js';
import Supplier from '../../../models/Supplier.js';
import BatchTracking from '../../../models/BatchTracking.js';
import ProductVariant from '../../../models/ProductVariant.js';
import { sequelize } from '../../database/index.js';
import { Op } from 'sequelize';
import Shop from '../../../models/Shop.js';
import StockMovement from '../../../models/StockMovement.js';
import { BusinessInventoryStats } from '../../../types/inventory.js';

const IPC_CHANNELS = {
  GET_INVENTORY_STATUS: 'inventory:status:get',
  GET_BUSINESS_INVENTORY_STATS: 'inventory:stats:get-business',
  GET_SHOP_INVENTORY_STATS: 'inventory:stats:get-shop',
  TRANSFER_STOCK: 'inventory:transfer',
  UPDATE_STOCK: 'inventory:stock:update',
  CHECK_LOW_STOCK: 'inventory:low-stock:check',
  GET_EXPIRING_PRODUCTS: 'inventory:expiring-products:get',
};

interface UpdateStockParams {
  productId: string;
  quantity: number;
  batchId?: string;
  variantId?: string;
  type: 'increment' | 'decrement';
}

export function registerInventoryHandlers() {
  // Get inventory status
  ipcMain.handle(IPC_CHANNELS.GET_INVENTORY_STATUS, async (event: IpcMainInvokeEvent, { businessId }) => {
    try {
      // Get all shops for the business
      const shops = await Shop.findAll({
        where: { businessId }
      });

      const stats: BusinessInventoryStats = {
        total_value: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        total_products: 0,
        shop_stats: {}
      };

      // Calculate stats for each shop
      for (const shop of shops) {
        const inventoryItems = await InventoryItem.findAll({
          include: [
            {
              model: Inventory,
              as: 'inventory',
              where: { shopId: shop.id },
              required: true
            }
          ]
        });

        const shopStats = {
          inventory_value: 0,
          product_count: inventoryItems.length,
          low_stock_count: 0
        };

        inventoryItems.forEach(item => {
          const itemValue = item.quantity * item.unit_cost;
          shopStats.inventory_value += itemValue;
          stats.total_value += itemValue;

          if (item.quantity <= 0) stats.out_of_stock_items++;
          if (item.quantity <= item.reorder_point) {
            stats.low_stock_items++;
            shopStats.low_stock_count++;
          }
        });

        stats.shop_stats[shop.id] = shopStats;
        stats.total_products += shopStats.product_count;
      }

      return { success: true, stats };

    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch inventory status' 
      };
    }
  });

  // Get business-wide inventory statistics
  ipcMain.handle(IPC_CHANNELS.GET_BUSINESS_INVENTORY_STATS, async (event: IpcMainInvokeEvent, { 
    businessId 
  }) => {
    try {
      // Get all shops for the business
      const shops = await Shop.findAll({
        where: { businessId }
      });

      const stats: BusinessInventoryStats = {
        total_value: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        total_products: 0,
        shop_stats: {}
      };

      // Calculate stats for each shop
      for (const shop of shops) {
        const inventoryItems = await InventoryItem.findAll({
          include: [
            {
              model: Inventory,
              as: 'inventory',
              where: { shopId: shop.id },
              required: true
            }
          ]
        });

        const shopStats = {
          inventory_value: 0,
          product_count: inventoryItems.length,
          low_stock_count: 0
        };

        inventoryItems.forEach(item => {
          const itemValue = item.quantity * item.unit_cost;
          shopStats.inventory_value += itemValue;
          stats.total_value += itemValue;

          if (item.quantity <= 0) stats.out_of_stock_items++;
          if (item.quantity <= item.reorder_point) {
            stats.low_stock_items++;
            shopStats.low_stock_count++;
          }
        });

        stats.shop_stats[shop.id] = shopStats;
        stats.total_products += shopStats.product_count;
      }

      return { success: true, stats };

    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch business inventory stats' 
      };
    }
  });

  // Handle stock transfers between shops
  ipcMain.handle(IPC_CHANNELS.TRANSFER_STOCK, async (event: IpcMainInvokeEvent, { 
    sourceInventoryId,
    destinationInventoryId,
    productId,
    quantity,
    performedBy_id,
    businessId
  }) => {
    const transaction = await sequelize.transaction();
    
    try {
      // Verify both inventories belong to the same business
      const [sourceInventory, destInventory] = await Promise.all([
        Inventory.findOne({
          include: [{
            model: Shop,
            where: { businessId }
          }],
          where: { id: sourceInventoryId }
        }),
        Inventory.findOne({
          include: [{
            model: Shop,
            where: { businessId }
          }],
          where: { id: destinationInventoryId }
        })
      ]);

      if (!sourceInventory || !destInventory) {
        throw new Error('Invalid inventory access');
      }

      // Get the source inventory item to get the cost per unit
      const sourceInventoryItem = await InventoryItem.findOne({
        where: {
          inventory_id: sourceInventoryId,
          product_id: productId
        }
      });

      if (!sourceInventoryItem) {
        throw new Error('Source inventory item not found');
      }

      // Create transfer movement
      await StockMovement.create({
        inventoryItem_id: sourceInventoryItem.id,
        movementType: 'transfer',
        quantity,
        direction: 'outbound',
        source_inventory_id: sourceInventoryId,
        destination_inventory_id: destinationInventoryId,
        performedBy: performedBy_id,
        reason: 'Inter-shop transfer',
        cost_per_unit: sourceInventoryItem.unit_cost,
        total_cost: sourceInventoryItem.unit_cost * quantity,
        status: 'completed'
      }, { transaction });

      // Update quantities
      await Promise.all([
        InventoryItem.decrement('quantity', {
          by: quantity,
          where: { 
            inventory_id: sourceInventoryId,
            product_id: productId
          },
          transaction
        }),
        InventoryItem.increment('quantity', {
          by: quantity,
          where: { 
            inventory_id: destinationInventoryId,
            product_id: productId
          },
          transaction
        })
      ]);

      await transaction.commit();
      return { success: true };

    } catch (error) {
      await transaction.rollback();
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to transfer stock' 
      };
    }
  });

  // Update stock
  ipcMain.handle(IPC_CHANNELS.UPDATE_STOCK, async (event: IpcMainInvokeEvent, { 
    productId,
    quantity,
    batchId,
    variantId,
    type
  }) => {
    const t = await sequelize.transaction();
    try {
      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        throw new Error('Product not found');
      }

      // Update variant stock if specified
      if (variantId) {
        const variant = await ProductVariant.findByPk(variantId, { transaction: t });
        if (!variant) {
          throw new Error('Variant not found');
        }
        await variant.update({
          stock_quantity: type === 'increment' 
            ? variant.stock_quantity + quantity 
            : variant.stock_quantity - quantity
        }, { transaction: t });
      }

      // Update batch quantity if specified
      if (batchId) {
        const batch = await BatchTracking.findByPk(batchId, { transaction: t });
        if (!batch) {
          throw new Error('Batch not found');
        }
        await batch.update({
          quantity: type === 'increment' 
            ? batch.quantity + quantity 
            : batch.quantity - quantity
        }, { transaction: t });
      }

      // Update main product quantity
      await product.update({
        quantity: type === 'increment' 
          ? product.quantity + quantity 
          : product.quantity - quantity
      }, { transaction: t });

      await t.commit();
      return product;

    } catch (error) {
      await t.rollback();
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update stock' 
      };
    }
  });

  // Check low stock
  ipcMain.handle(IPC_CHANNELS.CHECK_LOW_STOCK, async (event: IpcMainInvokeEvent, { 
    shopId
  }) => {
    try {
      const products = await Product.findAll({
        where: {
          shop_id: shopId,
          quantity: {
            [Op.lte]: sequelize.col('minimumStockLevel')
          }
        },
        include: [
          {
            model: BatchTracking,
            as: 'batches',
            required: false,
            where: {
              status: 'active'
            }
          },
          {
            model: ProductVariant,
            as: 'variants',
            required: false
          }
        ]
      });

      return { success: true, products };

    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to check low stock' 
      };
    }
  });

  // Get expiring products
  ipcMain.handle(IPC_CHANNELS.GET_EXPIRING_PRODUCTS, async (event: IpcMainInvokeEvent, { 
    shopId,
    daysThreshold = 30
  }) => {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysThreshold);

      const products = await Product.findAll({
        where: {
          shop_id: shopId,
          hasExpiryDate: true
        },
        include: [
          {
            model: BatchTracking,
            as: 'batches',
            required: true,
            where: {
              expiry_date: {
                [Op.lte]: expiryDate,
                [Op.gt]: new Date()
              },
              status: 'active'
            }
          }
        ]
      });

      return { success: true, products };

    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get expiring products' 
      };
    }
  });
}