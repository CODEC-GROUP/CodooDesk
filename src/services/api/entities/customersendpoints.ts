import { ipcMain } from 'electron';
import Customer from '../../../models/Customer.js';
import Sales from '../../../models/Sales.js';
import Shop from '../../../models/Shop.js';
import { sequelize } from '../../database/index.js';
import { FindOptions, FindAttributeOptions, Includeable } from 'sequelize';
import { Op } from 'sequelize';
import Order from '../../../models/Order.js';
import Product from '../../../models/Product.js';

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
  ipcMain.handle(IPC_CHANNELS.GET_ALL_CUSTOMERS, async (event, { userId, role, shopIds }) => {
    try {
      let customers: CustomerWithAggregates[];
      
      const baseQuery: FindOptions = {
        include: [
          {
            model: Shop,
            as: 'shops',
            attributes: ['id', 'name'],
            through: { 
              attributes: []
            },
            ...(shopIds?.length ? { 
              where: { 
                id: { 
                  [Op.in]: shopIds 
                } 
              } 
            } : {})
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
          [sequelize.fn('COUNT', sequelize.col('sales.id')), 'orders'],
          [sequelize.fn('SUM', sequelize.col('sales.netAmount')), 'spent']
        ] as FindAttributeOptions,
        group: ['Customer.id', 'shops.id', 'shops.name'],
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
              ...(baseQuery.include as any[])[0],
              where: { id: shopIds }
            },
            (baseQuery.include as Includeable[])[1]
          ]
        }) as unknown as CustomerWithAggregates[];
      }

      // Format the response
      const formattedCustomers = customers.reduce((acc: any[], customer: any) => {
        const existingCustomer = acc.find(c => c.id === customer.id);
        
        if (existingCustomer) {
          // Add shop to existing customer if not already present
          if (customer.shops && !existingCustomer.shops.some((s: any) => s.id === customer.shops.id)) {
            existingCustomer.shops.push({
              id: customer.shops.id,
              name: customer.shops.name
            });
          }
        } else {
          // Create new customer entry
          acc.push({
            id: customer.id,
            name: `${customer.first_name} ${customer.last_name}`,
            phone: customer.phone_number,
            orders: parseInt(customer.orders) || 0,
            spent: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'XAF'
            }).format(parseFloat(customer.spent) || 0),
            shops: customer.shops ? [{
              id: customer.shops.id,
              name: customer.shops.name
            }] : []
          });
        }
        return acc;
      }, []);

      return { success: true, customers: formattedCustomers };
    } catch (error) {
      console.error('Error fetching customers:', error);
      return { success: false, message: 'Failed to fetch customers' };
    }
  });

  // Get customer by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_CUSTOMER, async (event, { id }) => {
    try {
      const customer = await Customer.findByPk(id, {
        include: [{
          model: Sales,
          as: 'sales',
          include: [
            {
              model: Order,
              as: 'orders',
              include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'sellingPrice']
              }]
            },
            {
              model: Shop,
              as: 'shop',
              attributes: ['id', 'name']
            }
          ]
        }]
      });

      if (!customer) {
        return { success: false, message: 'Customer not found' };
      }

      // Format sales as orders for frontend display
      const orders = customer.sales?.flatMap(sale => 
        sale.orders?.map(order => ({
          ...(order as any).get({ plain: true }),
          saleDate: sale.createdAt,
          shop: (sale as any).shop,
          paymentMethod: sale.paymentMethod,
          status: sale.status
        })) || []
      ) || [];

      return { 
        success: true, 
        customer: {
          ...customer.get({ plain: true }),
          orders
        } 
      };
    } catch (error) {
      return { success: false, message: 'Error retrieving customer', error };
    }
  });

  // Update customer handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_CUSTOMER, async (event, { id, updates }) => {
    const t = await sequelize.transaction();

    try {
      const customer = await Customer.findByPk(id, {
        include: [{
          model: Shop,
          as: 'shops'
        }, {
          model: Sales,
          as: 'sales',
          attributes: []
        }],
        transaction: t
      });

      if (!customer) {
        await t.rollback();
        return { success: false, message: 'Customer not found' };
      }

      await customer.update({
        first_name: updates.first_name,
        last_name: updates.last_name,
        phone_number: updates.phone_number,
        dateOfBirth: updates.dateOfBirth,
        address: updates.address,
        city: updates.city,
        region: updates.region,
        country: updates.country
      }, { transaction: t });

      // Update shop associations if provided
      if (updates.shopIds) {
        await customer.setShops(updates.shopIds, { transaction: t });
      }

      await t.commit();

      // Fetch updated customer with all necessary data
      const updatedCustomer = await Customer.findByPk(id, {
        include: [{
          model: Shop,
          as: 'shops',
          attributes: ['id', 'name']
        }, {
          model: Sales,
          as: 'sales',
          attributes: []
        }],
        attributes: {
          include: [
            [sequelize.fn('COUNT', sequelize.col('sales.id')), 'orders'],
            [sequelize.fn('SUM', sequelize.col('sales.netAmount')), 'spent']
          ]
        },
        group: ['Customer.id', 'shops.id']
      });

      // Format the response to match frontend expectations
      const serializedCustomer = {
        id: updatedCustomer?.id,
        name: `${updatedCustomer?.first_name} ${updatedCustomer?.last_name}`,
        phone: updatedCustomer?.phone_number,
        orders: parseInt(updatedCustomer?.get('orders') as string) || 0,
        spent: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'XAF'
        }).format(parseFloat(updatedCustomer?.get('spent') as string) || 0)
      };

      return { 
        success: true, 
        message: 'Customer updated successfully', 
        customer: serializedCustomer 
      };
    } catch (error) {
      await t.rollback();
      console.error('Error updating customer:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error updating customer'
      };
    }
  });

  // Delete customer handler
  ipcMain.handle(IPC_CHANNELS.DELETE_CUSTOMER, async (event, { id }) => {
    const t = await sequelize.transaction();

    try {
      const customer = await Customer.findByPk(id, { transaction: t });
      if (!customer) {
        await t.rollback();
        return { success: false, message: 'Customer not found' };
      }

      // Remove shop associations first
      await customer.setShops([], { transaction: t });
      
      // Then delete the customer
      await customer.destroy({ transaction: t });
      
      await t.commit();
      return { success: true, message: 'Customer deleted successfully' };
    } catch (error) {
      await t.rollback();
      console.error('Error deleting customer:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error deleting customer'
      };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
