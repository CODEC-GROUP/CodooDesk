import { ipcMain } from 'electron';
import Inventory from '../../../models/Inventory.js';
import { createErrorResponse, createSuccessResponse } from '../../../utils/errorHandling.js';
import { Op } from 'sequelize';
import { sequelize } from '../../database/index.js';

const IPC_CHANNELS = {
  CHECK_LOW_STOCK: 'inventory:alerts:check-low-stock',
  UPDATE_ALERT_SETTINGS: 'inventory:alerts:update-settings'
};

export function registerInventoryAlertHandlers() {
  ipcMain.handle(IPC_CHANNELS.CHECK_LOW_STOCK, async (event, { shopId }) => {
    try {
      const lowStockItems = await Inventory.findAll({
        where: {
          shopId,
          level: {
            [Op.lte]: sequelize.col('minimumStockLevel')
          }
        },
        include: ['product']
      });

      return createSuccessResponse(lowStockItems);
    } catch (error) {
      return createErrorResponse(error);
    }
  });
} 