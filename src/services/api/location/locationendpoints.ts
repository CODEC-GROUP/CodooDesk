import { ipcMain } from 'electron';
import Location, { LocationAttributes } from '../../../models/Location.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_LOCATION: 'location:create',
  GET_ALL_LOCATIONS: 'location:get-all',
  GET_LOCATION: 'location:get',
  UPDATE_LOCATION: 'location:update',
  DELETE_LOCATION: 'location:delete'
};

// Register IPC handlers
export function registerLocationHandlers() {
  // Create location handler
  ipcMain.handle(IPC_CHANNELS.CREATE_LOCATION, async (event, { locationData }) => {
    try {
      const location = await Location.create(locationData);
      return { success: true, message: 'Location created successfully', location };
    } catch (error) {
      return { success: false, message: 'Error creating location', error };
    }
  });

  // Get all locations handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_LOCATIONS, async () => {
    try {
      const locations = await Location.findAll();
      return { success: true, locations };
    } catch (error) {
      return { success: false, message: 'Error fetching locations', error };
    }
  });

  // Get location by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_LOCATION, async (event, { id }) => {
    try {
      const location = await Location.findByPk(id);
      if (!location) {
        return { success: false, message: 'Location not found' };
      }
      return { success: true, location };
    } catch (error) {
      return { success: false, message: 'Error retrieving location', error };
    }
  });

  // Update location handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_LOCATION, async (event, { id, updates }) => {
    try {
      const location = await Location.findByPk(id);
      if (!location) {
        return { success: false, message: 'Location not found' };
      }
      await location.update(updates);
      return { success: true, message: 'Location updated successfully', location };
    } catch (error) {
      return { success: false, message: 'Error updating location', error };
    }
  });

  // Delete location handler
  ipcMain.handle(IPC_CHANNELS.DELETE_LOCATION, async (event, { id }) => {
    try {
      const location = await Location.findByPk(id);
      if (!location) {
        return { success: false, message: 'Location not found' };
      }
      await location.destroy();
      return { success: true, message: 'Location deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting location', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
