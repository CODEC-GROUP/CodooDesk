import { ipcMain } from 'electron';
import ShopSettings from '../../../models/ShopSettings.js';
import Shop from '../../../models/Shop.js';
import { ShopSettingsAttributes } from '../../../types/settings';

const IPC_CHANNELS = {
  GET_SHOP_SETTINGS: 'settings:shop:get',
  UPDATE_SHOP_SETTINGS: 'settings:shop:update',
};

export function registerSettingsHandlers() {
  // Get shop settings
  ipcMain.handle(IPC_CHANNELS.GET_SHOP_SETTINGS, async (event, { shopId }) => {
    try {
      const settings = await ShopSettings.findOne({
        where: { shopId },
        include: [{
          model: Shop,
          as: 'shop',
          attributes: ['name', 'businessId']
        }]
      });

      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = await ShopSettings.create({ 
          shopId,
          currency: 'FCFA',
          timezone: 'Africa/Douala',
          language: 'fr',
          weightUnit: 'kg',
          volumeUnit: 'liter',
          lengthUnit: 'meter',
          operatingHours: {
            monday: { open: '08:00', close: '18:00' },
            tuesday: { open: '08:00', close: '18:00' },
            wednesday: { open: '08:00', close: '18:00' },
            thursday: { open: '08:00', close: '18:00' },
            friday: { open: '08:00', close: '18:00' },
            saturday: { open: '08:00', close: '18:00' },
            sunday: null
          },
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          taxRate: 0,
          invoicePrefix: 'INV',
          receiptPrefix: 'REC',
          orderPrefix: 'ORD',
          lowStockThreshold: 10,
          enableStockAlerts: true,
          enableCustomerLoyalty: false
        });
        return { success: true, settings: defaultSettings };
      }

      return { success: true, settings };
    } catch (error) {
      console.error('Error fetching shop settings:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch settings'
      };
    }
  });

  // Update shop settings
  ipcMain.handle(IPC_CHANNELS.UPDATE_SHOP_SETTINGS, async (event, { shopId, settings }) => {
    try {
      const [shopSettings] = await ShopSettings.upsert({
        shopId,
        currency: settings.currency || 'FCFA',
        timezone: settings.timezone || 'Africa/Douala',
        language: settings.language || 'fr',
        operatingHours: settings.operatingHours || {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '08:00', close: '18:00' },
          sunday: null
        },
        dateFormat: settings.dateFormat || 'DD/MM/YYYY',
        timeFormat: settings.timeFormat || '24h',
        taxRate: settings.taxRate ?? 0,
        invoicePrefix: settings.invoicePrefix || 'INV',
        receiptPrefix: settings.receiptPrefix || 'REC',
        orderPrefix: settings.orderPrefix || 'ORD',
        ...settings
      });

      return { success: true, settings: shopSettings };
    } catch (error) {
      console.error('Error updating shop settings:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update settings'
      };
    }
  });
} 