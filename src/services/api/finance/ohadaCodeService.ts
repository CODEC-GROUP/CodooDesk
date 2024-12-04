import { ipcMain } from 'electron';
import OhadaCode from '../../../models/OhadaCode.js';

const IPC_CHANNELS = {
  GET_ALL_OHADA_CODES: 'finance:ohada-codes:get-all',
  GET_OHADA_CODES_BY_TYPE: 'finance:ohada-codes:get-by-type',
};

export function registerOhadaCodeHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_ALL_OHADA_CODES, async () => {
    try {
      const codes = await OhadaCode.findAll();
      return { success: true, codes };
    } catch (error) {
      return { success: false, message: 'Error fetching OHADA codes', error };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_OHADA_CODES_BY_TYPE, async (event, { type }) => {
    try {
      const codes = await OhadaCode.findAll({
        where: { type }
      });
      return { success: true, codes };
    } catch (error) {
      return { success: false, message: 'Error fetching OHADA codes', error };
    }
  });
}

export { IPC_CHANNELS }; 