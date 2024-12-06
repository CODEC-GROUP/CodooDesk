import { ipcMain } from 'electron';
import OhadaCode, { OhadaCodeAttributes } from '../../../models/OhadaCode.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_OHADA_CODE: 'finance:ohada-codes:create',
  GET_ALL_OHADA_CODES: 'finance:ohada-codes:get-all',
  GET_OHADA_CODE: 'finance:ohada-codes:get',
  GET_OHADA_CODES_BY_TYPE: 'finance:ohada-codes:get-by-type',
  UPDATE_OHADA_CODE: 'finance:ohada-codes:update',
  DELETE_OHADA_CODE: 'finance:ohada-codes:delete'
};

// Register IPC handlers
export function registerOhadaCodeHandlers() {
  // Create OHADA code handler
  ipcMain.handle(IPC_CHANNELS.CREATE_OHADA_CODE, async (event, { data }) => {
    try {
      const ohadaCode = await OhadaCode.create(data);
      return { success: true, message: 'OHADA code created successfully', code: ohadaCode };
    } catch (error) {
      return { success: false, message: 'Error creating OHADA code', error };
    }
  });

  // Get all OHADA codes handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_OHADA_CODES, async () => {
    try {
      const codes = await OhadaCode.findAll({
        order: [['code', 'ASC']]
      });
      return { success: true, codes };
    } catch (error) {
      return { success: false, message: 'Error fetching OHADA codes', error };
    }
  });

  // Get OHADA codes by type handler
  ipcMain.handle(IPC_CHANNELS.GET_OHADA_CODES_BY_TYPE, async (event, { type }) => {
    try {
      const codes = await OhadaCode.findAll({
        where: { type },
        order: [['code', 'ASC']]
      });
      return { success: true, codes };
    } catch (error) {
      return { success: false, message: 'Error fetching OHADA codes', error };
    }
  });

  // Get single OHADA code handler
  ipcMain.handle(IPC_CHANNELS.GET_OHADA_CODE, async (event, { id }) => {
    try {
      const code = await OhadaCode.findByPk(id);
      if (!code) {
        return { success: false, message: 'OHADA code not found' };
      }
      return { success: true, code };
    } catch (error) {
      return { success: false, message: 'Error fetching OHADA code', error };
    }
  });

  // Update OHADA code handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_OHADA_CODE, async (event, { id, data }) => {
    try {
      const code = await OhadaCode.findByPk(id);
      if (!code) {
        return { success: false, message: 'OHADA code not found' };
      }
      await code.update(data);
      return { success: true, message: 'OHADA code updated successfully', code };
    } catch (error) {
      return { success: false, message: 'Error updating OHADA code', error };
    }
  });

  // Delete OHADA code handler
  ipcMain.handle(IPC_CHANNELS.DELETE_OHADA_CODE, async (event, { id }) => {
    try {
      const code = await OhadaCode.findByPk(id);
      if (!code) {
        return { success: false, message: 'OHADA code not found' };
      }
      await code.destroy();
      return { success: true, message: 'OHADA code deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting OHADA code', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
