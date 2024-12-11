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

      // First, explicitly check for existing user with better error handling
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: userData.email.toLowerCase() },
            { username: userData.username.toLowerCase() }
          ]
        },
        paranoid: false  // This will check even soft-deleted records
      });

      if (existingUser) {
        console.log('Found existing user:', {
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username
        });
        
        return {
          success: false,
          message: existingUser.email === userData.email.toLowerCase()
            ? 'An account with this email already exists'
            : 'This username is already taken'
        };
      }

      // Add debug logging before user creation
      console.log('Creating new user with data:', {
        email: userData.email.toLowerCase(),
        username: userData.username.toLowerCase(),
        role: userData.role || 'shop_owner'
      });

      // Create user with role
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = await User.create({
        email: userData.email.toLowerCase(),
        username: userData.username.toLowerCase(),
        password_hash: hashedPassword,
        role: userData.role || 'shop_owner',
        shopId: undefined,
      }, { 
        transaction: t,
        // Add validation options
        validate: true,
        hooks: true
      }).catch(error => {
        // Detailed error logging
        console.error('User creation failed:', {
          name: error.name,
          message: error.message,
          errors: error.errors,
          sql: error.sql
        });
        throw error;
      });

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

      // For shop owners, fetch the business with shops if it exists
      if (newUser.role === 'shop_owner') {
        const business = await BusinessInformation.findOne({
          where: { ownerId: newUser.id },
          include: [{
            model: Shop,
            as: 'shops',
            include: [{
              model: Location,
              as: 'location',
              attributes: ['address', 'city', 'country', 'region', 'postalCode']
            }]
          }]
        });

        if (business) {
          const businessJSON = business.toJSON();
          return {
            success: true,
            message: 'User registered successfully',
            user: {
              id: newUser.id,
              username: newUser.username,
              email: newUser.email,
              role: newUser.role
            },
            business: {
              id: businessJSON.id,
              fullBusinessName: businessJSON.fullBusinessName,
              shopLogo: businessJSON.shopLogo,
              address: businessJSON.address,
              businessType: businessJSON.businessType,
              numberOfEmployees: businessJSON.numberOfEmployees,
              taxIdNumber: businessJSON.taxIdNumber,
              shops: businessJSON.shops?.map((shop: any) => ({
                id: shop.id,
                name: shop.name,
                type: shop.type,
                status: shop.status,
                contactInfo: shop.contactInfo,
                manager: shop.manager,
                managerId: shop.managerId,
                businessId: shop.businessId,
                location: shop.location ? {
                  address: shop.location.address,
                  city: shop.location.city,
                  country: shop.location.country,
                  region: shop.location.region,
                  postalCode: shop.location.postalCode
                } : null,
                operatingHours: shop.operatingHours
              })) as Shop[] | undefined,
            }
          };
        }
      }

      // For employees, fetch their assigned shop
      if (userData.role !== 'shop_owner' && userData.shopId) {
        const employee = await Employee.findOne({
          where: { userId: newUser.id },
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

        if (employee?.shop) {
          const business = await BusinessInformation.findOne({
            where: { id: employee.shop.businessId },
            include: [{
              model: Shop,
              as: 'shops',
              include: [{
                model: Location,
                as: 'location',
                attributes: ['address', 'city', 'country', 'region', 'postalCode']
              }]
            }]
          });

          if (business) {
            const businessJSON = business.toJSON();
            const employeeJSON = employee.toJSON();
            
            return {
              success: true,
              message: 'User registered successfully',
              user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
              },
              business: {
                id: businessJSON.id,
                fullBusinessName: businessJSON.fullBusinessName,
                shopLogo: businessJSON.shopLogo,
                address: businessJSON.address,
                businessType: businessJSON.businessType,
                numberOfEmployees: businessJSON.numberOfEmployees,
                taxIdNumber: businessJSON.taxIdNumber,
                shops: businessJSON.shops?.map((shop: any) => ({
                  id: shop.id,
                  name: shop.name,
                  type: shop.type,
                  status: shop.status,
                  contactInfo: shop.contactInfo,
                  manager: shop.manager,
                  managerId: shop.managerId,
                  businessId: shop.businessId,
                  location: shop.location ? {
                    address: shop.location.address,
                    city: shop.location.city,
                    country: shop.location.country,
                    region: shop.location.region,
                    postalCode: shop.location.postalCode
                  } : null,
                  operatingHours: shop.operatingHours
                })) as Shop[] | undefined,
              }
            };
          }
        }
      }

      // Default response if no business/shop data is available
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
      console.error('Registration failed with detailed error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        sql: error.sql,
        errors: error.errors
      });

      // Better error messages based on error type
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path;
        return {
          success: false,
          message: field === 'email' 
            ? 'This email is already registered. Please try logging in or use a different email.'
            : 'This username is already taken. Please choose a different username.'
        };
      }

      if (error.name === 'SequelizeValidationError') {
        return {
          success: false,
          message: error.errors[0]?.message || 'Invalid input data'
        };
      }

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
        const business = await BusinessInformation.findOne({
          where: { ownerId: user.id },
          include: [{
            model: Shop,
            as: 'shops',
            include: [{
              model: Location,
              as: 'location',
              attributes: ['address', 'city', 'country', 'region', 'postalCode']
            }]
          }]
        });
        
        // Check if business setup is complete
        if (!business) {
          isSetupComplete = false;
        } else {
          const businessJSON = business.toJSON();
          return {
            success: true,
            message: 'Login successful',
            user: safeUser,
            business: {
              id: businessJSON.id,
              fullBusinessName: businessJSON.fullBusinessName,
              shopLogo: businessJSON.shopLogo,
              address: businessJSON.address,
              businessType: businessJSON.businessType,
              numberOfEmployees: businessJSON.numberOfEmployees,
              taxIdNumber: businessJSON.taxIdNumber,
              shops: businessJSON.shops?.map((shop: any) => ({
                id: shop.id,
                name: shop.name,
                type: shop.type,
                status: shop.status,
                contactInfo: shop.contactInfo,
                manager: shop.manager,
                managerId: shop.managerId,
                businessId: shop.businessId,
                location: shop.location ? {
                  address: shop.location.address,
                  city: shop.location.city,
                  country: shop.location.country,
                  region: shop.location.region,
                  postalCode: shop.location.postalCode
                } : null,
                operatingHours: shop.operatingHours
              })) as Shop[] | undefined,
            },
            isSetupComplete
          };
        }
      } else {
        // For non-owner users, get their shop through employee record
        const employee = await Employee.findOne({ 
          where: { userId: user.id },
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

        if (employee?.shop) {
          const business = await BusinessInformation.findOne({
            where: { id: employee.shop.businessId },
            include: [{
              model: Shop,
              as: 'shops',
              include: [{
                model: Location,
                as: 'location',
                attributes: ['address', 'city', 'country', 'region', 'postalCode']
              }]
            }]
          });

          if (business) {
            const businessJSON = business.toJSON();
            const employeeJSON = employee.toJSON();

            return {
              success: true,
              message: 'Login successful',
              user: safeUser,
              business: {
                id: businessJSON.id,
                fullBusinessName: businessJSON.fullBusinessName,
                shopLogo: businessJSON.shopLogo,
                address: businessJSON.address,
                businessType: businessJSON.businessType,
                numberOfEmployees: businessJSON.numberOfEmployees,
                taxIdNumber: businessJSON.taxIdNumber,
                shops: businessJSON.shops?.map((shop: any) => ({
                  id: shop.id,
                  name: shop.name,
                  type: shop.type,
                  status: shop.status,
                  contactInfo: shop.contactInfo,
                  manager: shop.manager,
                  managerId: shop.managerId,
                  businessId: shop.businessId,
                  location: shop.location ? {
                    address: shop.location.address,
                    city: shop.location.city,
                    country: shop.location.country,
                    region: shop.location.region,
                    postalCode: shop.location.postalCode
                  } : null,
                  operatingHours: shop.operatingHours
                })) as Shop[] | undefined,
              },
              isSetupComplete
            };
          }
        }
      }

      return {
        success: true,
        message: 'Login successful',
        user: safeUser,
        business: null,
        shop: null,
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
