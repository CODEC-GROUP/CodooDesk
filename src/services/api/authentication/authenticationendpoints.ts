import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import User from '../../../models/User.js';
import { sequelize } from '../../database/index.js';
import Employee from '../../../models/Employee.js';
import Shop from '../../../models/Shop.js';
import BusinessInformation from '../../../models/BusinessInformation.js';
import { Op } from 'sequelize';
import type { ShopAttributes } from '../../../models/Shop.js';
import Location from '../../../models/Location.js';
import SecurityLog from '../../../models/SecurityLog.js';
import { DataTypes } from 'sequelize';
// IPC Channel names
const IPC_CHANNELS = {
  REGISTER: 'auth:register',
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  CHECK: 'auth:check'
};

// Add this near the top with other model imports
type Business = ReturnType<BusinessInformation['toJSON']>;
interface ShopWithLocation extends ShopAttributes {
  location?: {
    address: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    country: {
      name: string;
      code?: string;
    };
  } | null;
}

interface ShopLocation {
  address: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  postalCode: string | null;
}

interface ExtendedShopAttributes extends ShopAttributes {
  location?: ShopLocation | null;
  employees?: Array<{
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  }> | null;
}

interface ShopsByBusiness {
  [key: string]: Shop[];
}

type UserRole = 'admin' | 'shop_owner' | 'manager' | 'seller';

// Register IPC handlers
export function registerAuthHandlers() {
  console.log('=== AUTH HANDLERS START ===');
  console.log('Registering authentication handlers...');

  // Register user handler
  ipcMain.handle(IPC_CHANNELS.REGISTER, async (event, userData) => {
    console.log('=== REGISTER START ===');
    console.log('Registration attempt with data:', JSON.stringify(userData, null, 2));
    
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
        paranoid: false,  // This will check even soft-deleted records
        logging: (sql) => console.log('Executing SQL:', sql)
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
              shops: business?.shops?.map((shop: any) => ({
                id: shop.id,
                name: shop.name,
                type: shop.type,
                status: shop.status,
                contactInfo: shop.contactInfo,
                manager: shop.manager,
                businessId: shop.businessId,
                location: shop.location ? {
                  address: shop.location.address,
                  city: shop.location.city,
                  country: shop.location.country,
                  region: shop.location.region,
                  postalCode: shop.location.postalCode
                } : null,
                operatingHours: shop.operatingHours
              })) ?? [],
            },
            isSetupComplete: !!business.taxIdNumber
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
          console.log('Fetching business information for employee shop:', employee.shop.businessId);
          const business = await BusinessInformation.findOne({
            where: { id: employee.shop.businessId },
            include: [{
              model: Shop,
              as: 'shops',
              where: { id: employee.shop.id }, // Only include the employee's shop
              include: [{
                model: Location,
                as: 'location',
                attributes: ['address', 'city', 'country', 'region', 'postalCode']
              }]
            }]
          });

          if (business && business.shops?.[0]) {
            const businessJSON = business.toJSON();
            const employeeShop = business.shops[0].toJSON() as ExtendedShopAttributes;

            const loginResponse = {
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
                shops: [{
                  id: employeeShop.id,
                  name: employeeShop.name,
                  type: employeeShop.type,
                  status: employeeShop.status,
                  contactInfo: employeeShop.contactInfo,
                  manager: employeeShop.manager,
                  businessId: employeeShop.businessId,
                  location: employeeShop.location ? {
                    address: employeeShop.location.address,
                    city: employeeShop.location.city,
                    country: employeeShop.location.country,
                    region: employeeShop.location.region,
                    postalCode: employeeShop.location.postalCode
                  } : null,
                  operatingHours: employeeShop.operatingHours
                }]
              },
              isSetupComplete: true,
              shopId: employeeShop.id
            };

            // Log detailed login response information
            console.log('=== LOGIN RESPONSE DETAILS ===');
            console.log('User:', {
              id: loginResponse.user.id,
              username: loginResponse.user.username,
              email: loginResponse.user.email,
              role: loginResponse.user.role
            });
            console.log('Business:', {
              id: loginResponse.business.id,
              name: loginResponse.business.fullBusinessName,
              type: loginResponse.business.businessType
            });
            console.log('Available Shops:', loginResponse.business.shops.map(shop => ({
              id: shop.id,
              name: shop.name,
              type: shop.type
            })));
            console.log('Employee Shop ID:', loginResponse.shopId);
            console.log('Setup Complete:', loginResponse.isSetupComplete);
            console.log('=== END LOGIN RESPONSE ===');

            return loginResponse;
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
        },
        business: null,
        isSetupComplete: false
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
  ipcMain.handle(IPC_CHANNELS.LOGIN, async (event, credentials) => {
    console.log('=== LOGIN START ===');
    console.log('Login attempt with email:', credentials.email);
    
    try {
      if (!credentials.email || !credentials.password) {
        console.log('Login failed: Missing credentials');
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      console.log('Finding user in database...');
      const user = await User.findOne({
        where: { email: credentials.email.toLowerCase() },
        attributes: ['id', 'username', 'email', 'password_hash', 'is_staff', 'role', 'locationId', 'shopId', 'createdAt', 'updatedAt']
      });

      if (!user) {
        console.log('Login failed: No user found with email:', credentials.email);
        await SecurityLog.create({
          user_id: null,
          event_type: 'failed_login',
          ip_address: event.sender.getURL().split(':')[2] || 'unknown',
          user_agent: event.sender.getUserAgent(),
          status: 'failure',
          event_description: 'Attempted login with non-existent email',
          severity: 'medium',
          shop_id: null,
        });
        return {
          success: false,
          message: 'User not found'
        };
      }

      console.log('User found, verifying password...');
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);

      if (!isPasswordValid) {
        console.log('Login failed: Invalid password for user:', credentials.email);
        await SecurityLog.create({
          user_id: user.id,
          event_type: 'failed_login',
          ip_address: event.sender.getURL().split(':')[2] || 'unknown',
          user_agent: event.sender.getUserAgent(),
          status: 'failure',
          event_description: 'Incorrect password entered',
          severity: 'medium',
          shop_id: user.shopId || null,
        });
        return {
          success: false,
          message: 'Incorrect password'
        };
      }

      console.log('Password verified successfully');
      
      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locationId: user.locationId
      };
      console.log('User data prepared:', JSON.stringify(safeUser, null, 2));

      let shopId = null;
      let isSetupComplete = true;  // Default to true for employees

      // Move the SecurityLog creation before any return statements
      await SecurityLog.create({
        user_id: user.id,
        event_type: 'login',
        ip_address: event.sender.getURL().split(':')[2] || 'unknown',
        user_agent: event.sender.getUserAgent(),
        status: 'success',
        event_description: 'User logged in successfully',
        severity: 'low',
        shop_id: user.shopId || null,
      });

      if (user.role === 'admin') {
        // Get all shops for admin users
        const allShops = await Shop.findAll({
          include: [
            {
              model: Location,
              as: 'location',
              attributes: ['address', 'city', 'country', 'region', 'postalCode']
            },
            {
              model: BusinessInformation,
              as: 'business',
              attributes: ['id', 'fullBusinessName', 'businessType']
            }
          ]
        });

        // Group shops by business
        const shopsByBusiness = allShops.reduce<ShopsByBusiness>((acc, shop) => {
          const businessId = shop.businessId;
          if (!acc[businessId]) {
            acc[businessId] = [];
          }
          acc[businessId].push(shop);
          return acc;
        }, {});

        // Get all businesses
        const businesses = await BusinessInformation.findAll();
        
        // Format response with consistent structure
        return {
          success: true,
          user: safeUser,
          isSetupComplete: true,
          businesses: businesses.map(business => {
            const businessJSON = business.toJSON();
            return {
              id: businessJSON.id,
              fullBusinessName: businessJSON.fullBusinessName,
              shopLogo: businessJSON.shopLogo,
              address: businessJSON.address,
              businessType: businessJSON.businessType,
              numberOfEmployees: businessJSON.numberOfEmployees,
              taxIdNumber: businessJSON.taxIdNumber,
              shops: (shopsByBusiness[business.id] || []).map((shop: Shop) => {
                const shopJSON = shop.toJSON();
                const location = shop.get('location') as ShopLocation;
                const employees = shop.get('employees') as Array<{
                  id: number;
                  firstName: string;
                  lastName: string;
                  role: string;
                }>;
                return {
                  id: shopJSON.id,
                  name: shopJSON.name,
                  type: shopJSON.type,
                  status: shopJSON.status,
                  contactInfo: shopJSON.contactInfo,
                  manager: shopJSON.manager,
                  businessId: shopJSON.businessId,
                  location: location ? {
                    address: location.address,
                    city: location.city,
                    country: location.country,
                    region: location.region,
                    postalCode: location.postalCode
                  } : null,
                  operatingHours: shopJSON.operatingHours,
                  employees: employees || []
                };
              })
            };
          })
        };
      }
      else if (user.role === 'shop_owner') {
        // For shop owners, get all their business information with all shops
        const business = await BusinessInformation.findOne({
          where: { ownerId: user.id },
          include: [{
            model: Shop,
            as: 'shops',
            include: [
              {
                model: Location,
                as: 'location',
                attributes: ['address', 'city', 'country', 'region', 'postalCode']
              },
              {
                model: Employee,
                as: 'employees',
                attributes: ['id', 'firstName', 'lastName', 'role']
              }
            ]
          }]
        });

        if (!business) {
          return {
            success: true,
            user: safeUser,
            isSetupComplete: false,
            business: null,
            shops: []
          };
        }

        const businessJSON = business.toJSON();
        
        // Format response with consistent structure
        return {
          success: true,
          user: safeUser,
          isSetupComplete: true,
          business: {
            id: businessJSON.id,
            fullBusinessName: businessJSON.fullBusinessName,
            shopLogo: businessJSON.shopLogo,
            address: businessJSON.address,
            businessType: businessJSON.businessType,
            numberOfEmployees: businessJSON.numberOfEmployees,
            taxIdNumber: businessJSON.taxIdNumber,
            shops: business.shops?.map(shop => {
              const shopJSON = shop.toJSON();
              const location = shop.get('location') as ShopLocation;
              const employees = shop.get('employees') as Array<{
                id: number;
                firstName: string;
                lastName: string;
                role: string;
              }>;
              return {
                id: shopJSON.id,
                name: shopJSON.name,
                type: shopJSON.type,
                status: shopJSON.status,
                contactInfo: shopJSON.contactInfo,
                manager: shopJSON.manager,
                businessId: shopJSON.businessId,
                location: location ? {
                  address: location.address,
                  city: location.city,
                  country: location.country,
                  region: location.region,
                  postalCode: location.postalCode
                } : null,
                operatingHours: shopJSON.operatingHours,
                employees: employees || []
              };
            }) || []
          }
        };
      }
      else {
        // For regular employees, get their assigned shop and the business it belongs to
        console.log('Fetching employee information for user:', user.id);
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

        if (!employee?.shop) {
          return {
            success: false,
            message: 'No shop assigned to this employee account'
          };
        }

        // Get the business information but only include the employee's assigned shop
        const business = await BusinessInformation.findOne({
          where: { id: employee.shop.businessId },
          include: [{
            model: Shop,
            as: 'shops',
            where: { id: employee.shop.id }, // Only include the employee's shop
            include: [{
              model: Location,
              as: 'location',
              attributes: ['address', 'city', 'country', 'region', 'postalCode']
            }]
          }]
        });

        if (!business || !business.shops?.[0]) {
          return {
            success: false,
            message: 'Business information not found for this employee'
          };
        }

        const businessJSON = business.toJSON();
        const employeeShop = business.shops[0].toJSON() as ExtendedShopAttributes;

        // Format response with consistent structure but only include the employee's shop
        const loginResponse = {
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
            shops: [{
              id: employeeShop.id,
              name: employeeShop.name,
              type: employeeShop.type,
              status: employeeShop.status,
              contactInfo: employeeShop.contactInfo,
              manager: employeeShop.manager,
              businessId: employeeShop.businessId,
              location: employeeShop.location ? {
                address: employeeShop.location.address,
                city: employeeShop.location.city,
                country: employeeShop.location.country,
                region: employeeShop.location.region,
                postalCode: employeeShop.location.postalCode
              } : null,
              operatingHours: employeeShop.operatingHours
            }]
          },
          isSetupComplete: true,
          shopId: employeeShop.id
        };

        // Log detailed login response information
        console.log('=== LOGIN RESPONSE DETAILS ===');
        console.log('User:', {
          id: loginResponse.user.id,
          username: loginResponse.user.username,
          email: loginResponse.user.email,
          role: loginResponse.user.role
        });
        console.log('Business:', {
          id: loginResponse.business.id,
          name: loginResponse.business.fullBusinessName,
          type: loginResponse.business.businessType
        });
        console.log('Available Shops:', loginResponse.business.shops.map(shop => ({
          id: shop.id,
          name: shop.name,
          type: shop.type
        })));
        console.log('Employee Shop ID:', loginResponse.shopId);
        console.log('Setup Complete:', loginResponse.isSetupComplete);
        console.log('=== END LOGIN RESPONSE ===');

        return loginResponse;
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
      // Log unexpected errors
      await SecurityLog.create({
        user_id: null,
        event_type: 'system_change',
        ip_address: event.sender.getURL().split(':')[2] || 'unknown',
        user_agent: event.sender.getUserAgent(),
        status: 'failure',
        event_description: 'System error during login process',
        severity: 'high',
        shop_id: null,
      });
      
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  });

  // Logout handler
  ipcMain.handle(IPC_CHANNELS.LOGOUT, async (event, { userId }) => {
    console.log('=== LOGOUT START ===');
    console.log('Logout request received');
    try {
      // Add any necessary cleanup here (e.g., invalidating sessions)
      // Log logout
      await SecurityLog.create({
        user_id: userId,
        event_type: 'logout',
        ip_address: event.sender.getURL().split(':')[2] || 'unknown',
        user_agent: event.sender.getUserAgent(),
        status: 'success',
        event_description: 'User logged out successfully',
        severity: 'low',
        shop_id: null,
      });

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error: unknown) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  });

  // Auth check handler
  ipcMain.handle(IPC_CHANNELS.CHECK, async (event, { userId }) => {
    console.log('=== AUTH CHECK START ===');
    console.log('Auth check request received for user:', userId);
    
    try {
      // For offline mode, just check if the user exists
      const user = await User.findByPk(userId);
      
      if (user) {
        return {
          success: true,
          isAuthenticated: true
        };
      }

      return {
        success: false,
        isAuthenticated: false
      };
    } catch (error: unknown) {
      console.error('Auth check error:', error);
      return {
        success: false,
        isAuthenticated: false
      };
    }
  });

  ipcMain.handle('getEmployeeActivities', async (event, { userId }) => {
    try {
      return await SecurityLog.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: 50
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  });

  console.log('=== AUTH HANDLERS END ===');
  console.log('Authentication handlers registered successfully');
  console.log('[IPC] Authentication handlers registered');
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
