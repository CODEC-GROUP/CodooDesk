import { ipcMain } from 'electron';
import InventoryItem, { InventoryItemAttributes } from '../../../models/InventoryItem.js';
import Inventory from '../../../models/Inventory.js';
import { Op } from 'sequelize';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_ITEM: 'inventory:item:create',
  GET_ALL_ITEMS_BY_INVENTORY_ID: 'inventory:item:get-all-by-inventory-id',
  GET_ITEM: 'inventory:item:get',
  UPDATE_ITEM: 'inventory:item:update',
  DELETE_ITEM: 'inventory:item:delete',
};

// Register IPC handlers
export function registerInventoryItemHandlers() {
  // Create inventory item handler
  ipcMain.handle(IPC_CHANNELS.CREATE_ITEM, async (event, { itemData }) => {
    try {
      const item = await InventoryItem.create(itemData);
      return { success: true, message: 'Inventory item created successfully', item };
    } catch (error) {
      return { success: false, message: 'Error creating inventory item', error };
    }
  });

  // Get all inventory items by inventory ID handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_ITEMS_BY_INVENTORY_ID, async (event, { inventoryId }) => {
    try {
      const items = await InventoryItem.findAll({
        include: [{
          model: Inventory,
          as: 'inventories',
          where: { id: inventoryId },
        }],
      });
      return { success: true, items };
    } catch (error) {
      return { success: false, message: 'Error fetching inventory items', error };
    }
  });

  // Get inventory item by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_ITEM, async (event, { id }) => {
    try {
      const item = await InventoryItem.findByPk(id);
      if (!item) {
        return { success: false, message: 'Inventory item not found' };
      }
      return { success: true, item };
    } catch (error) {
      return { success: false, message: 'Error retrieving inventory item', error };
    }
  });
  // Update inventory item handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_ITEM, async (event, { id, updates }) => {
    try {
      const item = await InventoryItem.findByPk(id);
      if (!item) {
        return { success: false, message: 'Inventory item not found' };
      }
      await item.update(updates);
      return { success: true, message: 'Inventory item updated successfully', item };
    } catch (error) {
      return { success: false, message: 'Error updating inventory item', error };
    }
  });

  // Delete inventory item handler
  ipcMain.handle(IPC_CHANNELS.DELETE_ITEM, async (event, { id }) => {
    try {
      const item = await InventoryItem.findByPk(id);
      if (!item) {
        return { success: false, message: 'Inventory item not found' };
      }
      await item.destroy();
      return { success: true, message: 'Inventory item deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting inventory item', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
