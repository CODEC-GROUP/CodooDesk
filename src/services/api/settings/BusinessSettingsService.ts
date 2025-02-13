import { ipcMain } from 'electron';
import BusinessSettings from '../../../models/BusinessSettings.js';
import BusinessInformation from '../../../models/BusinessInformation.js';

const IPC_CHANNELS = {
  GET_BUSINESS_SETTINGS: 'settings:business:get',
  UPDATE_BUSINESS_SETTINGS: 'settings:business:update',
  UPDATE_PROFILE_SETTINGS: 'settings:business:update-profile',
  UPDATE_NOTIFICATION_SETTINGS: 'settings:business:update-notifications',
  UPDATE_SECURITY_SETTINGS: 'settings:business:update-security',
  UPDATE_UNIT_SETTINGS: 'settings:business:update-units',
};

export function registerBusinessSettingsHandlers() {
  // Get business settings
  ipcMain.handle(IPC_CHANNELS.GET_BUSINESS_SETTINGS, async (event, { businessId }) => {
    try {
      const settings = await BusinessSettings.findOne({
        where: { businessId },
        include: [{
          model: BusinessInformation,
          as: 'business',
          attributes: ['fullBusinessName']
        }]
      });

      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = await BusinessSettings.create({
          businessId,
          profileSettings: {
            language: 'en',
            timezone: 'Africa/Douala',
            dateFormat: 'DD/MM/YYYY',
            currency: 'XAF'
          },
          notificationSettings: {
            personalizedOffers: true,
            newFeatures: true,
            securityAlerts: true,
            billingUpdates: true
          },
          securitySettings: {
            requirePasswordChange: false,
            passwordExpiryDays: 90,
            twoFactorEnabled: false,
            sessionTimeout: 30
          },
          unitSettings: {
            weightUnit: 'kg',
            volumeUnit: 'l',
            lengthUnit: 'm'
          }
        });
        return { success: true, settings: defaultSettings };
      }

      return { success: true, settings };
    } catch (error) {
      console.error('Error fetching business settings:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch settings'
      };
    }
  });

  // Update specific sections of settings
  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE_SETTINGS, async (event, { businessId, settings }) => {
    try {
      const existingSettings = await BusinessSettings.findOne({ where: { businessId } });
      
      if (!existingSettings) {
        throw new Error('Settings not found');
      }

      const updatedSettings = await existingSettings.update({
        profileSettings: settings
      });

      return { success: true, settings: updatedSettings };
    } catch (error) {
      console.error('Error updating profile settings:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update settings'
      };
    }
  });

  // Similar handlers for other settings sections...
} 