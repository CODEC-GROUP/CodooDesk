import { ipcMain } from 'electron';
import Shop from '../../../models/Shop.js';
import BusinessInformation from '../../../models/BusinessInformation.js';
import Location from '../../../models/Location.js';
import Employee from '../../../models/Employee.js';
import User from '../../../models/User.js';

const IPC_CHANNELS = {
  SETUP_ACCOUNT: 'setup:create-account',
  CHECK_SETUP_STATUS: 'setup:check-status'
};

export function registerSetupHandlers() {
  ipcMain.handle(IPC_CHANNELS.SETUP_ACCOUNT, async (event, setupData) => {
    try {
      const { businessData, locationData, shopData, userId } = setupData;
      
      // Ensure address is correctly structured
      const address = {
        street: locationData.address,
        city: locationData.city,
        state: locationData.region,
        country: locationData.country.name,
        postalCode: locationData.postalCode || null
      };

      // Create business information first
      const business = await BusinessInformation.create({
        ...businessData,
        ownerId: userId,
        address, // Ensure address is passed correctly
        shopLogo: businessData.shopLogo || null, // Ensure shopLogo is a string
      });

      // Create shop location
      const location = await Location.create({
        address: locationData.address,
        city: locationData.city,
        region: locationData.region,
        country: locationData.country,
        postalCode: locationData.postalCode || null
      });

      // Create shop with both references
      const shop = await Shop.create({
        ...shopData,
        businessId: business.id,
        locationId: location.id
      });

      // Only create manager user and employee records if not manager
      if (!shopData.isManager) {
        // First create the manager's user account
        const managerUser = await User.create({
          username: shopData.managerName,
          email: shopData.managerEmail,
          password_hash: shopData.password, // Note: This should be hashed before saving
          role: 'manager',
          shopId: shop.id
        });

        // Then create the employee record linked to the new user
        await Employee.create({
          userId: managerUser.id,
          firstName: shopData.managerName,
          email: shopData.managerEmail,
          role: 'manager',
          shopId: shop.id,
          businessId: business.id,
          hireDate: new Date(),
          status: 'active',
          employmentStatus: 'full-time',
          salary: 0
        });
      }

      // Fetch complete shop data with associations
      const completeShop = await Shop.findByPk(shop.id, {
        include: [
          { model: BusinessInformation, as: 'business' },
          { model: Location, as: 'location' }
        ]
      });

      if (!completeShop) {
        console.error('Failed to find shop with ID:', shop.id);
        throw new Error(`Shop not found after creation. ID: ${shop.id}`);
      }

      // Fetch complete business data with shops
      const completeBusiness = await BusinessInformation.findByPk(business.id, {
        include: [{
          model: Shop,
          as: 'shops',
          include: [
            { model: Location, as: 'location' },
            { model: Employee, as: 'employees', attributes: ['id', 'firstName', 'lastName', 'role'] }
          ]
        }]
      });

      if (!completeBusiness) {
        throw new Error('Failed to fetch complete business data');
      }

      // Send all data directly in the response root
      return {
        success: true,
        message: 'Account setup completed successfully',
        business: completeBusiness.toJSON(),
        shop: completeShop.toJSON(),
        location: location.toJSON(),
        isSetupComplete: true
      };
    } catch (error: any) {
      console.error('Setup error:', error);
      return {
        success: false,
        message: 'Failed to complete account setup',
        error: error?.message || 'Unknown error occurred'
      };
    }
  });

  // Check setup status handler
  ipcMain.handle(IPC_CHANNELS.CHECK_SETUP_STATUS, async (event, { userId }) => {
    try {
      if (!userId) {
        return {
          success: false,
          isSetupComplete: false,
          message: 'No user ID provided'
        };
      }

      console.log('Checking setup status for user:', userId);

      // Find business information for the user with explicit include
      const business = await BusinessInformation.findOne({
        where: { ownerId: userId },
        include: [{
          model: Shop,
          as: 'shops',
          required: false  // Use LEFT JOIN
        }]
      });

      console.log('Found business:', business?.toJSON());
      
      const isSetupComplete = !!business && Array.isArray(business.shops) && business.shops.length > 0;

      return {
        success: true,
        isSetupComplete,
        message: isSetupComplete ? 'Setup is complete' : 'Setup is not complete',
        debug: { 
          hasBusiness: !!business,
          shopsCount: business?.shops?.length || 0 
        }
      };
    } catch (error: any) {
      console.error('Setup status check error:', error);
      return {
        success: false,
        isSetupComplete: false,
        message: error?.message || 'Failed to check setup status'
      };
    }
  });
}

export { IPC_CHANNELS };
