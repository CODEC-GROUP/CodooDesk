import { ipcMain, IpcMainInvokeEvent } from 'electron';
import StockMovement from '../../../models/StockMovement.js';
import Product from '../../../models/Product.js';
import Inventory from '../../../models/Inventory.js';
import User from '../../../models/User.js';
import { sequelize } from '../../database/index.js';
import { Op } from 'sequelize';
import { createErrorResponse } from '../../../utils/errorHandling.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_MOVEMENT: 'stock-movement:create',
  GET_MOVEMENTS: 'stock-movement:get-all',
  GET_MOVEMENT: 'stock-movement:get',
  GET_MOVEMENTS_BY_DATE: 'stock-movement:get-by-date',
  GET_MOVEMENTS_BY_PRODUCT: 'stock-movement:get-by-product',
  CREATE_ADJUSTMENT: 'stock-movement:create-adjustment',
};

export function registerStockMovementHandlers() {
  // Create stock movement
  ipcMain.handle(IPC_CHANNELS.CREATE_MOVEMENT, async (event, { data, businessId }) => {
    // Should add validation and inventory updates
    const transaction = await sequelize.transaction();
    try {
      // Validate current stock levels
      const sourceInventory = await Inventory.findByPk(data.source_inventory_id);
      if (!sourceInventory || sourceInventory.level < data.quantity) {
        throw new Error('Insufficient stock');
      }

      // Create movement record
      const movement = await StockMovement.create({
        ...data,
        performedBy: data.userId,
        status: 'completed'
      }, { transaction });

      // Update inventory levels
      await sourceInventory.decrement('level', {
        by: data.quantity,
        transaction
      });

      if (data.destination_inventory_id) {
        await Inventory.increment('level', {
          where: { id: data.destination_inventory_id },
          by: data.quantity,
          transaction
        });
      }

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
  ipcMain.handle(IPC_CHANNELS.CREATE_ADJUSTMENT, async (event: IpcMainInvokeEvent, { 
    data,
    businessId 
  }) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { 
        productId,
        inventory_id,
        physical_count,
        system_count,
        reason,
        performedBy_id
      } = data;

      const discrepancy = physical_count - system_count;

      // Create adjustment movement
      const adjustment = await StockMovement.create({
        productId,
        movementType: 'adjustment',
        quantity: Math.abs(discrepancy),
        direction: discrepancy > 0 ? 'inbound' : 'outbound',
        source_inventory_id: inventory_id,
        performedBy_id,
        reason,
        physical_count,
        system_count,
        discrepancy,
        adjustment_reason: reason,
        cost_per_unit: 0,
        total_cost: 0
      }, { transaction });

      // Update inventory quantity
      const inventory = await Inventory.findByPk(inventory_id);
      if (!inventory) {
        throw new Error('Inventory not found');
      }

      await inventory.update({
        level: physical_count
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