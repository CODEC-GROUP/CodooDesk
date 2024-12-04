import { ipcMain } from 'electron';
import Inventory, { InventoryAttributes } from '../../../models/Inventory.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_INVENTORY: 'inventory:create',
  GET_INVENTORY: 'inventory:get',
  UPDATE_INVENTORY: 'inventory:update',
  DELETE_INVENTORY: 'inventory:delete'
};

// Register IPC handlers
export function registerInventoryHandlers() {
  // Create inventory handler
  ipcMain.handle(IPC_CHANNELS.CREATE_INVENTORY, async (event, { name, level, value, shopId }) => {
    try {
      const inventory = await Inventory.create({
        name,
        level,
        value,
        shopId,
      });
      return { success: true, message: 'Inventory created successfully', inventory };
    } catch (error) {
      return { success: false, message: 'Error creating inventory', error };
    }
  });

  // Get inventory by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_INVENTORY, async (event, { id }) => {
    try {
      const inventory = await Inventory.findByPk(id);
      if (!inventory) {
        return { success: false, message: 'Inventory not found' };
      }
      return { success: true, inventory };
    } catch (error) {
      return { success: false, message: 'Error retrieving inventory', error };
    }
  });

  // Update inventory handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_INVENTORY, async (event, { id, updates }) => {
    try {
      const inventory = await Inventory.findByPk(id);
      if (!inventory) {
        return { success: false, message: 'Inventory not found' };
      }
      await inventory.update(updates);
      return { success: true, message: 'Inventory updated successfully', inventory };
    } catch (error) {
      return { success: false, message: 'Error updating inventory', error };
    }
  });

  // Delete inventory handler
  ipcMain.handle(IPC_CHANNELS.DELETE_INVENTORY, async (event, { id }) => {
    try {
      const inventory = await Inventory.findByPk(id);
      if (!inventory) {
        return { success: false, message: 'Inventory not found' };
      }
      await inventory.destroy();
      return { success: true, message: 'Inventory deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting inventory', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
