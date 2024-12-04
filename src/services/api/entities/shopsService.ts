import { ipcMain } from 'electron';
import Shop from '../../../models/Shop.js';
import Location from '../../../models/Location.js';
import { sequelize } from '../../database/index.js';
import Employee from '../../../models/Employee.js';
import User from '../../../models/User.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_SHOP: 'entities:shop:create',
  GET_ALL_SHOPS: 'entities:shop:get-all',
  GET_SHOP: 'entities:shop:get',
  UPDATE_SHOP: 'entities:shop:update',
  DELETE_SHOP: 'entities:shop:delete'
};

// Register IPC handlers
export function registerShopHandlers() {
  // Create shop handler
  ipcMain.handle(IPC_CHANNELS.CREATE_SHOP, async (event, { shopData, locationData }) => {
    const t = await sequelize.transaction();
    
    try {
      // Validate required fields
      if (!shopData.name || !shopData.type || !locationData.address) {
        throw new Error('Missing required fields');
      }

      // Create location first
      const shopLocation = await Location.create({
        address: locationData.address,
        city: locationData.city,
        country: locationData.country,
        region: locationData.region || null,
        postalCode: locationData.postalCode || null,
      }, { transaction: t });

      // Format operating hours
      interface OperatingHours {
        [key: string]: string;
      }

      const formattedHours: OperatingHours = {};
      if (shopData.operatingHours) {
        Object.entries(shopData.operatingHours).forEach(([day, hours]) => {
          if (hours && typeof hours === 'string') {
            formattedHours[day] = hours;
          }
        });
      }

      let managerName = null;
      if (shopData.managerId) {
        // Find the employee and update their role
        const employee = await Employee.findByPk(shopData.managerId, {
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'role']
          }]
        });
        
        if (employee && employee.get('user')) {
          managerName = `${employee.firstName} ${employee.lastName}`.trim();
          // Update employee role to manager
          await employee.update({ role: 'manager' }, { transaction: t });
          // Update associated user role if exists
          const user = employee.get('user') as User;
          await user.update({ role: 'manager' }, { transaction: t });
        }
      }

      // Create shop with location ID and manager
      const shop = await Shop.create({
        name: shopData.name,
        type: shopData.type,
        status: 'active',
        locationId: shopLocation.id,
        manager: managerName || shopData.manager,
        contactInfo: {
          email: shopData.contactInfo?.email,
          phone: shopData.contactInfo?.phone
        },
        operatingHours: formattedHours,
        businessId: shopData.businessId
      }, { 
        transaction: t,
        include: ['location'] 
      });

      await t.commit();

      const locationDetails = await Location.findByPk(shop.locationId);

      return { 
        success: true, 
        message: 'Shop created successfully', 
        shop: {
          ...shop.toJSON(),
          location: locationDetails?.toJSON()
        }
      };
    } catch (error) {
      await t.rollback();
      console.error('Error creating shop:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error creating shop'
      };
    }
  });

  // Get all shops handler with proper includes and error handling
// ... existing imports ...

// Update the GET_ALL_SHOPS handler
ipcMain.handle(IPC_CHANNELS.GET_ALL_SHOPS, async (event, { businessId, userId, role }) => {
  try {
    let whereClause = {};
    
    // If admin or shop owner, get all shops for the business
    if (role === 'admin' || role === 'owner') {
      whereClause = { businessId };
    } else {
      // For other roles, get shops associated with the user
      const userShops = await Employee.findOne({
        where: {
          userId: userId 
        },
        include: [{
          model: Shop,
          as: 'shop',
          include: [{
            model: Location,
            as: 'location',
            attributes: ['address', 'city', 'country', 'region', 'postalCode']
          }]
        }]
      });

      if (!userShops) {
        return { 
          success: true, 
          shops: [] 
        };
      }

      // Return only the user's assigned shop
      const shop = userShops.shop;
      if (shop) {
        const location = await Location.findByPk(shop.locationId);
        return {
          success: true,
          shops: [{
            ...shop.toJSON(),
            location: location?.toJSON() ?? null
          }]
        };
      } else {
        return { 
          success: true, 
          shops: [] 
        };
      }
    }

    const shops = await Shop.findAll({
      where: whereClause,
      include: [{
        model: Location,
        as: 'location',
        attributes: ['address', 'city', 'country', 'region', 'postalCode']
      }]
    });

    return { 
      success: true, 
      shops: await Promise.all(shops.map(async shop => {
        const shopData = shop.toJSON();
        const location = await Location.findByPk(shopData.locationId);
        return {
          ...shopData,
          location: location?.toJSON() ?? null
        };
      }))
    };
  } catch (error) {
    console.error('Error fetching shops:', error);
    return { 
      success: false, 
      message: 'Error fetching shops',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

  // Update shop handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_SHOP, async (event, { shopId, shopData, locationData }) => {
    const t = await sequelize.transaction();
    
    try {
      // Find the shop and its associated location
      const shop = await Shop.findByPk(shopId, {
        include: [{ model: Location }],
        transaction: t
      });

      if (!shop) {
        throw new Error('Shop not found');
      }

      // Update location if provided
      if (locationData && shop.locationId) {
        await Location.update({
          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          region: locationData.region || null,
          postalCode: locationData.postalCode || null,
        }, {
          where: { id: shop.locationId },
          transaction: t
        });
      }

      // Format operating hours if provided
      let formattedHours: { [key: string]: string } = {};
      if (shopData.operatingHours) {
        Object.entries(shopData.operatingHours).forEach(([day, hours]) => {
          if (hours && typeof hours === 'string') {
            formattedHours[day] = hours;
          }
        });
      }

      // Update shop
      await shop.update({
        name: shopData.name,
        type: shopData.type,
        status: shopData.status,
        contactInfo: shopData.contactInfo || shop.contactInfo,
        operatingHours: formattedHours || shop.operatingHours,
        manager: shopData.manager || shop.manager,
      }, { transaction: t });

      await t.commit();

      const updatedLocation = await Location.findByPk(shop.locationId);

      return {
        success: true,
        shop: {
          ...shop.toJSON(),
          location: updatedLocation?.toJSON()
        }
      };
    } catch (error) {
      await t.rollback();
      console.error('Error updating shop:', error);
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message
        };
      } else {
        return {
          success: false,
          message: 'Failed to update shop'
        };
      }
    }
  });

  // Delete shop handler with proper cleanup
  ipcMain.handle(IPC_CHANNELS.DELETE_SHOP, async (event, { id }) => {
    const t = await sequelize.transaction();
    
    try {
      const shop = await Shop.findByPk(id);
      if (!shop) {
        throw new Error('Shop not found');
      }

      // Delete associated location
      await Location.destroy({
        where: { id: shop.locationId },
        transaction: t
      });

      // Delete shop
      await shop.destroy({ transaction: t });

      await t.commit();
      return { 
        success: true, 
        message: 'Shop deleted successfully'
      };
    } catch (error) {
      await t.rollback();
      console.error('Error deleting shop:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error deleting shop'
      };
    }
  });
}

export { IPC_CHANNELS };
