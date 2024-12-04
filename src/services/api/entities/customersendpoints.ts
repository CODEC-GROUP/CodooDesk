import { ipcMain } from 'electron';
import Customer from '../../../models/Customer.js';
import Sales from '../../../models/Sales.js';
import Shop from '../../../models/Shop.js';
import { sequelize } from '../../database/index.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_CUSTOMER: 'entities:customer:create',
  GET_ALL_CUSTOMERS: 'entities:customer:get-all',
  GET_CUSTOMER: 'entities:customer:get',
  UPDATE_CUSTOMER: 'entities:customer:update',
  DELETE_CUSTOMER: 'entities:customer:delete'
};

// Add this interface above the handler
interface CustomerWithAggregates extends Customer {
  orders: string;  // COUNT returns string
  spent: string;   // SUM returns string
}

// Register IPC handlers
export function registerCustomerHandlers() {
  // Create customer handler
  ipcMain.handle(IPC_CHANNELS.CREATE_CUSTOMER, async (event, { customerData }) => {
    try {
      const customer = await Customer.create({
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        phone_number: customerData.phoneNumber,
        dateOfBirth: customerData.dateOfBirth || new Date(),
        address: customerData.address,
        city: customerData.city,
        region: customerData.region,
        country: customerData.country || ''
      });

      // Associate customer with multiple shops
      if (customerData.shopIds && customerData.shopIds.length > 0) {
        await customer.setShops(customerData.shopIds);
      }

      return { success: true, message: 'Customer created successfully', customer };
    } catch (error) {
      console.error('Error creating customer:', error);
      return { success: false, message: 'Error creating customer', error };
    }
  });

  // Get all customers handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_CUSTOMERS, async (event, { userId, role, shopId }) => {
    try {
      let customers: CustomerWithAggregates[];
      
      const baseQuery = {
        include: [
          {
            model: Shop,
            as: 'shops',
            attributes: ['id', 'name'],
            through: { attributes: [] },
            where: shopId ? { id: shopId } : undefined,
          },
          {
            model: Sales,
            as: 'sales',
            attributes: []
          }
        ],
        attributes: [
          'id',
          'first_name',
          'last_name',
          'phone_number',
          [sequelize.fn('COUNT', sequelize.col('sales.id')), 'orders'] as unknown as [string, string],
          [sequelize.fn('SUM', sequelize.col('sales.netAmount')), 'spent'] as unknown as [string, string]
        ],
        group: ['Customer.id', 'shops.id'],
        raw: true,
        nest: true
      };

      if (role === 'shop_owner' || role === 'admin') {
        customers = await Customer.findAll(baseQuery) as unknown as CustomerWithAggregates[];
      } else {
        customers = await Customer.findAll({
          ...baseQuery,
          include: [
            {
              ...baseQuery.include[0],
              where: { id: shopId }
            },
            baseQuery.include[1]
          ]
        }) as unknown as CustomerWithAggregates[];
      }

      // Format the response
      const formattedCustomers = customers.map((customer) => ({
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        phone: customer.phone_number,
        orders: parseInt(customer.orders) || 0,
        spent: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(parseFloat(customer.spent) || 0)
      }));

      return { success: true, customers: formattedCustomers };
    } catch (error) {
      console.error('Error fetching customers:', error);
      return { success: false, message: 'Failed to fetch customers' };
    }
  });

  // Get customer by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_CUSTOMER, async (event, { id }) => {
    try {
      const customer = await Customer.findByPk(id);
      if (!customer) {
        return { success: false, message: 'Customer not found' };
      }
      return { success: true, customer };
    } catch (error) {
      return { success: false, message: 'Error retrieving customer', error };
    }
  });

  // Update customer handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_CUSTOMER, async (event, { id, updates }) => {
    try {
      const customer = await Customer.findByPk(id);
      if (!customer) {
        return { success: false, message: 'Customer not found' };
      }
      await customer.update(updates);
      return { success: true, message: 'Customer updated successfully', customer };
    } catch (error) {
      return { success: false, message: 'Error updating customer', error };
    }
  });

  // Delete customer handler
  ipcMain.handle(IPC_CHANNELS.DELETE_CUSTOMER, async (event, { id }) => {
    try {
      const customer = await Customer.findByPk(id);
      if (!customer) {
        return { success: false, message: 'Customer not found' };
      }
      await customer.destroy();
      return { success: true, message: 'Customer deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting customer', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
