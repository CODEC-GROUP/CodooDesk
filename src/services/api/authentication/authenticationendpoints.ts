import { ipcMain } from 'electron';
import bcrypt from 'bcrypt';
import User from '../../../models/User.js';
import { sequelize } from '../../database/index.js';
import Employee from '../../../models/Employee.js';
import Shop from '../../../models/Shop.js';
import BusinessInformation from '../../../models/BusinessInformation.js';
import { Op } from 'sequelize';
import Location from '../../../models/Location.js';

// IPC Channel names
const IPC_CHANNELS = {
  REGISTER: 'auth:register',
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  CHECK: 'auth:check'
};

// Register IPC handlers
export function registerAuthHandlers() {
  // Register user handler
  ipcMain.handle(IPC_CHANNELS.REGISTER, async (event, userData) => {
    const t = await sequelize.transaction();
    
    try {
      // Log incoming user data for debugging
      console.log('Starting registration process with data:', userData);

      // Validate required fields
      if (!userData.email || !userData.password || !userData.username) {
        const missingFields = [];
        if (!userData.email) missingFields.push('email');
        if (!userData.password) missingFields.push('password');
        if (!userData.username) missingFields.push('username');
        console.log('Registration validation failed. Missing fields:', missingFields);
        return {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        };
      }

      // Check for existing user
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: userData.email.toLowerCase() },
            { username: userData.username.toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        console.log('User already exists:', existingUser);
        return {
          success: false,
          message: existingUser.email === userData.email.toLowerCase() 
            ? 'An account with this email already exists' 
            : 'This username is already taken'
        };
      }

      // Create user with role
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = await User.create({
        email: userData.email.toLowerCase(),
        username: userData.username.toLowerCase(),
        password_hash: hashedPassword,
        role: userData.role || 'shop_owner',  // Default to shop_owner if not specified
        shopId: undefined,  // Will be updated later for employees
      }, { transaction: t });

      // If user is an employee, create employee record
      if (userData.role && userData.role !== 'shop_owner') {
        await Employee.create({
          userId: newUser.id,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email,
          phone: userData.phone || '',
          role: userData.role,
          shopId: userData.shopId,
          salary: userData.salary || 0,
          employmentStatus: userData.employmentStatus || 'full-time',
          hireDate: new Date(),
          status: 'active',
          businessId: userData.businessId
        }, { transaction: t });

        // Update user's shopId
        await newUser.update({ shopId: userData.shopId }, { transaction: t });
      }

      await t.commit();
      console.log(newUser)
      return {
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      };
    } catch (error: any) {
      await t.rollback();
      console.error('Registration failed with error:', error);
      return {
        success: false,
        message: `Registration failed: ${error.message}`
      };
    }
  });

  // Login user handler
  ipcMain.handle(IPC_CHANNELS.LOGIN, async (event, { email, password }) => {
    try {
      if (!email || !password) {
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      const user = await User.findOne({
        where: { email: email.toLowerCase() },
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['shopId']
        }]
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Incorrect password'
        };
      }

      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locationId: user.locationId
      };

      let shopId = null;
      let isSetupComplete = true;  // Default to true for employees

      if (user.role === 'shop_owner') {
        const business = await BusinessInformation.findOne({ where: { ownerId: user.id } });
        
        // Check if business setup is complete
        if (!business) {
          isSetupComplete = false;
        } else {
          const shop = await Shop.findOne({ where: { businessId: business.id } });
          shopId = shop?.id;
        }
      } else {
        // For non-owner users, get their shop through employee record
        const employee = await Employee.findOne({ 
          where: { userId: user.id },
          include: [{
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name', 'businessId']
          }]
        });

        if (employee?.shop) {
          const business = await BusinessInformation.findOne({
            where: { id: employee.shop.businessId },
            attributes: ['id', 'fullBusinessName', 'shopLogo', 'address', 'businessType', 'numberOfEmployees', 'taxIdNumber']
          });

          return {
            success: true,
            message: 'Login successful',
            user: safeUser,
            business: business ? {
              id: business.id,
              fullBusinessName: business.fullBusinessName,
              shopLogo: business.shopLogo,
              address: business.address,
              businessType: business.businessType,
              numberOfEmployees: business.numberOfEmployees,
              taxIdNumber: business.taxIdNumber
            } : null,
            shops: [employee.shop], // Include the user's assigned shop
            shopId: employee.shopId,
            isSetupComplete: true
          };
        }
      }

      let business = null;
      let shop = null;
      if (user.role === 'shop_owner') {
        business = await BusinessInformation.findOne({ 
          where: { ownerId: user.id },
          include: [{
            model: Shop,
            as: 'shops',
            attributes: ['id', 'name']
          }],
          attributes: ['id', 'fullBusinessName', 'shopLogo', 'address', 'businessType', 'numberOfEmployees', 'taxIdNumber']
        });

        if (business) {
          shop = await Shop.findOne({ 
            where: { businessId: business.id },
            include: [{
              model: Location,
              as: 'location',
              attributes: ['address', 'city', 'region', 'postalCode', 'country']
            }],
            attributes: ['id', 'name', 'contactInfo']
          });

          // Serialize the shop and location data
          const location = shop?.get('location') as Location | null;
          const serializedShop = shop ? {
            id: shop.id,
            name: shop.name,
            contactInfo: shop.contactInfo,
            location: location ? {
              address: location.address,
              city: location.city,
              region: location.region,
              postalCode: location.postalCode,
              country: location.country
            } : null
          } : null;

          return {
            success: true,
            message: 'Login successful',
            user: safeUser,
            business: business ? {
              id: business.id,
              fullBusinessName: business.fullBusinessName,
              shopLogo: business.shopLogo,
              address: business.address,
              businessType: business.businessType,
              numberOfEmployees: business.numberOfEmployees,
              taxIdNumber: business.taxIdNumber,
              shops: business.shops
            } : null,
            shop: serializedShop,
            shopId: shopId,
            isSetupComplete: isSetupComplete,
            token: 'jwt-token-here'
          };
        }
      }

      return {
        success: true,
        message: 'Login successful',
        user: safeUser,
        business: business, // Add business info to response
        shop: shop, // Add shop info to response
        shopId: shopId,
        isSetupComplete: isSetupComplete,
        token: 'jwt-token-here'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  });

  // Logout user handler
  ipcMain.handle(IPC_CHANNELS.LOGOUT, async (event) => {
    try {
      // Add any necessary cleanup here (e.g., invalidating sessions)
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'An error occurred during logout'
      };
    }
  });

  // Modify the auth check handler
  ipcMain.handle(IPC_CHANNELS.CHECK, async (event) => {
    try {
      // Get stored user data from wherever you're storing it
      // This is just an example - implement according to your auth strategy
      const storedUser = await User.findOne({ /* query based on your session/token */ });
      
      if (storedUser) {
        return {
          success: true,
          isAuthenticated: true,
          user: {
            id: storedUser.id,
            username: storedUser.username,
            email: storedUser.email,
            role: storedUser.role
          },
          message: 'User is authenticated'
        };
      }

      return {
        success: false,
        isAuthenticated: false,
        message: 'User is not authenticated'
      };
    } catch (error) {
      console.error('Auth check error:', error);
      return {
        success: false,
        isAuthenticated: false,
        message: 'Failed to check authentication status'
      };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
