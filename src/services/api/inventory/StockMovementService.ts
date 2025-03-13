import { ipcMain, IpcMainInvokeEvent } from 'electron';
import StockMovement from '../../../models/StockMovement.js';
import InventoryItem from '../../../models/InventoryItem.js';
import Product from '../../../models/Product.js';
import User from '../../../models/User.js';
import { sequelize } from '../../database/index.js';
import { Op } from 'sequelize';
import { createErrorResponse } from '../../../utils/errorHandling.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_MOVEMENT: 'stock-movement:create',
  GET_MOVEMENTS: 'stock-movement:get-all',
  GET_BY_INVENTORY: 'stock-movement:get-by-inventory',
  GET_MOVEMENT: 'stock-movement:get',
  GET_MOVEMENTS_BY_DATE: 'stock-movement:get-by-date',
  GET_MOVEMENTS_BY_PRODUCT: 'stock-movement:get-by-product',
  CREATE_ADJUSTMENT: 'stock-movement:create-adjustment',
};

export function registerStockMovementHandlers() {
  // Get stock movements by inventory ID
  ipcMain.handle(IPC_CHANNELS.GET_BY_INVENTORY, async (event, { 
    inventoryId,
    page = 1,
    limit = 10,
    movementType,
    searchTerm
  }) => {
    try {
      const whereClause: any = {
        source_inventory_id: inventoryId
      };
      
      if (movementType) {
        whereClause.movementType = movementType;
      }
      
      if (searchTerm) {
        whereClause[Op.or] = [
          { reason: { [Op.like]: `%${searchTerm}%` } },
          { movementType: { [Op.like]: `%${searchTerm}%` } }
        ];
      }

      const { count, rows } = await StockMovement.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: InventoryItem,
            as: 'inventoryItem',
            include: [{
              model: Product,
              as: 'product',
              attributes: ['name', 'sku']
            }]
          },
          {
            model: User,
            as: 'performer',
            attributes: ['username']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });

      return { 
        success: true, 
        movements: rows,
        total: count,
        pages: Math.ceil(count / limit)
      };

    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch stock movements' 
      };
    }
  });

  // Create stock movement
  ipcMain.handle(IPC_CHANNELS.CREATE_MOVEMENT, async (event, { 
    inventoryItemId,
    movementType,
    quantity,
    direction,
    reason,
    cost_per_unit,
    performedBy,
    source_inventory_id,
    destination_inventory_id
  }) => {
    const transaction = await sequelize.transaction();
    try {
      // Validate current stock levels
      const inventoryItem = await InventoryItem.findByPk(inventoryItemId);
      if (!inventoryItem) {
        throw new Error('Inventory item not found');
      }

      if (direction === 'outbound' && inventoryItem.quantity < quantity) {
        throw new Error('Insufficient stock');
      }

      // Create movement record
      const movement = await StockMovement.create({
        inventoryItem_id: inventoryItemId,
        movementType,
        quantity,
        direction,
        source_inventory_id,
        destination_inventory_id,
        reason,
        cost_per_unit,
        total_cost: quantity * cost_per_unit,
        performedBy,
        status: 'completed'
      }, { transaction });

      await transaction.commit();
      return { success: true, movement };
    } catch (error) {
      await transaction.rollback();
      return createErrorResponse(error);
    }
  });

  // Get stock movements with filters
  ipcMain.handle(IPC_CHANNELS.GET_MOVEMENTS, async (event: IpcMainInvokeEvent, { 
    businessId,
    inventoryId,
    startDate,
    endDate,
    movementType,
    productId,
    page = 1,
    limit = 10
  }) => {
    try {
      const whereClause: any = {};
      
      if (inventoryId) {
        whereClause.source_inventory_id = inventoryId;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [startDate, endDate]
        };
      }
      
      if (movementType) {
        whereClause.movementType = movementType;
      }
      
      if (productId) {
        whereClause.productId = productId;
      }

      const { count, rows } = await StockMovement.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['name', 'sku']
          },
          {
            model: User,
            as: 'performer',
            attributes: ['username']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });

      return { 
        success: true, 
        movements: rows,
        total: count,
        pages: Math.ceil(count / limit)
      };

    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch stock movements' 
      };
    }
  });

  // Create stock adjustment
  ipcMain.handle(IPC_CHANNELS.CREATE_ADJUSTMENT, async (event, { 
    data: {
      inventoryItemId,
      physical_count,
      reason,
      performedBy
    }
  }) => {
    const transaction = await sequelize.transaction();
    
    try {
      const inventoryItem = await InventoryItem.findByPk(inventoryItemId);
      if (!inventoryItem) {
        throw new Error('Inventory item not found');
      }

      const system_count = inventoryItem.quantity;
      const discrepancy = physical_count - system_count;

      // Create adjustment movement
      const adjustment = await StockMovement.create({
        inventoryItem_id: inventoryItemId,
        movementType: 'adjustment',
        quantity: Math.abs(discrepancy),
        direction: discrepancy > 0 ? 'inbound' : 'outbound',
        source_inventory_id: inventoryItem.inventory_id,
        reason,
        cost_per_unit: inventoryItem.unit_cost,
        total_cost: Math.abs(discrepancy) * inventoryItem.unit_cost,
        performedBy,
        status: 'completed'
      }, { transaction });

      await transaction.commit();
      return { success: true, adjustment };

    } catch (error) {
      await transaction.rollback();
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create adjustment' 
      };
    }
  });
} 