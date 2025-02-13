import { ipcMain } from 'electron';
import { Op } from 'sequelize';
import { CustomerSegment, Customer, Sales } from '../../../models';
import Shop from '../../../models/Shop.js';
import { sequelize } from '../../database/index.js';
import { CustomerAttributes, CustomerSegment as CustomerSegmentType } from '../../../types/customer';

// IPC Channel names
const IPC_CHANNELS = {
  ANALYZE_CUSTOMERS: 'customer:segment:analyze',
  AUTO_ASSIGN_SEGMENTS: 'customer:segment:auto-assign',
  GET_SEGMENT_STATS: 'customer:segment:stats'
};

// Add type for the customer analytics
interface CustomerAnalytics {
  sum: number;
  customer: Customer;
  saleSum: number;
  sale: Sales;
}

// Add these type definitions at the top
interface CustomerSegmentCriteria {
  min_purchase_amount?: number;
  min_purchase_frequency?: number;
}

interface CustomerSegmentAttributes {
  id: string;
  name: string;
  shop_id: string;
  criteria: CustomerSegmentCriteria;
}

// Update the CustomerSegment type definition to include the customers relationship
interface CustomerSegmentWithRelations extends CustomerSegmentAttributes {
  customers?: Customer[];
}

// Helper function for calculating customer lifetime value
function calculateCustomerLifetimeValue(customer: Customer): number {
  return customer.sales?.reduce((sum: number, sale: Sales) => {
    return sum + sale.netAmount;
  }, 0) || 0;
}

export function registerCustomerSegmentHandlers() {
  // Analyze customers for segmentation
  ipcMain.handle(IPC_CHANNELS.ANALYZE_CUSTOMERS, async (event, { shopId, startDate, endDate }) => {
    try {
      const customers = await Customer.findAll({
        include: [{
          model: Shop,
          as: 'shops',
          where: { id: shopId },
          required: true
        }, {
          model: Sales,
          as: 'sales',
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate]
            }
          },
          required: false
        }]
      });

      const customerAnalytics = await Promise.all(customers.map(async (customer) => {
        const totalPurchases = calculateCustomerLifetimeValue(customer);
        const purchaseFrequency = customer.sales?.length || 0;
        
        return {
          customerId: customer.id,
          customerName: `${customer.first_name} ${customer.last_name}`,
          totalPurchases,
          purchaseFrequency,
          averagePurchaseValue: purchaseFrequency > 0 ? totalPurchases / purchaseFrequency : 0
        };
      }));

      return { success: true, customerAnalytics };
    } catch (error) {
      return { success: false, message: 'Failed to analyze customers', error };
    }
  });

  // Auto-assign customers to segments based on criteria
  ipcMain.handle(IPC_CHANNELS.AUTO_ASSIGN_SEGMENTS, async (event, { shopId }) => {
    const t = await sequelize.transaction();
    try {
      const segments = await CustomerSegment.findAll({
        where: {
          shop_id: shopId
        },
        transaction: t
      });

      const customers = await Customer.findAll({
        include: [{
          model: Shop,
          as: 'shops',
          where: { id: shopId },
          required: true
        }, {
          model: Sales,
          as: 'sales'
        }],
        transaction: t
      });

      for (const customer of customers) {
        const totalPurchases = customer.sales?.reduce((sum, sale) => sum + sale.netAmount, 0) || 0;
        const purchaseFrequency = customer.sales?.length || 0;

        // Find matching segment based on criteria
        const matchingSegment = segments.find(segment => {
          const criteria = segment.criteria;
          return (
            (!criteria.min_purchase_amount || totalPurchases >= criteria.min_purchase_amount) &&
            (!criteria.min_purchase_frequency || purchaseFrequency >= criteria.min_purchase_frequency)
          );
        });

        if (matchingSegment) {
          await customer.update({ segment_id: matchingSegment.id }, { transaction: t });
        }
      }

      await t.commit();
      return { success: true, message: 'Customers auto-assigned to segments successfully' };
    } catch (error) {
      await t.rollback();
      return { success: false, message: 'Failed to auto-assign segments', error };
    }
  });

  // Get segment statistics
  ipcMain.handle(IPC_CHANNELS.GET_SEGMENT_STATS, async (event, { shopId }) => {
    try {
      const segments = await CustomerSegment.findAll({
        where: {
          shop_id: shopId
        },
        include: [{
          model: Customer,
          as: 'customers',
          include: [{
            model: Sales,
            as: 'sales'
          }]
        }]
      }) as CustomerSegmentWithRelations[];

      const segmentStats = segments.map(segment => {
        const customers = segment.customers || [];
        const totalCustomers = customers.length;
        const totalRevenue = customers.reduce((sum: number, customer: Customer) => 
          sum + (customer.sales?.reduce((saleSum: number, sale: Sales) => 
            saleSum + sale.netAmount, 0) || 0), 0);

        return {
          segmentId: segment.id,
          segmentName: segment.name,
          totalCustomers,
          totalRevenue,
          averageRevenuePerCustomer: totalCustomers > 0 ? totalRevenue / totalCustomers : 0
        };
      });

      return { success: true, segmentStats };
    } catch (error) {
      return { success: false, message: 'Failed to get segment statistics', error };
    }
  });
}

export { IPC_CHANNELS };
