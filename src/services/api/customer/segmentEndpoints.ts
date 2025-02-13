import { ipcMain } from 'electron';
import { CustomerSegment, Customer } from '../../../models/index.js';
import { Op } from 'sequelize';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_SEGMENT: 'customer:segment:create',
  GET_SEGMENTS: 'customer:segment:get-all',
  UPDATE_SEGMENT: 'customer:segment:update',
  DELETE_SEGMENT: 'customer:segment:delete',
  GET_SEGMENT_CUSTOMERS: 'customer:segment:get-customers',
  ASSIGN_CUSTOMERS: 'customer:segment:assign-customers'
};

// Rename the interface to avoid conflict with the imported type
interface CustomerSegmentWithCustomers {
  id: string;
  customers?: Customer[];
  // ... other properties
}

export function registerSegmentHandlers() {
  // Create segment handler
  ipcMain.handle(IPC_CHANNELS.CREATE_SEGMENT, async (event, segmentData) => {
    try {
      const segment = await CustomerSegment.create(segmentData);
      return { success: true, message: 'Segment created successfully', segment };
    } catch (error) {
      return { success: false, message: 'Error creating segment', error };
    }
  });

  // Get all segments
  ipcMain.handle(IPC_CHANNELS.GET_SEGMENTS, async (event, { shopId }) => {
    try {
      const segments = await CustomerSegment.findAll({
        where: { shop_id: shopId }
      });
      return { success: true, segments };
    } catch (error) {
      return { success: false, message: 'Error fetching segments', error };
    }
  });

  // Get customers in segment
  ipcMain.handle(IPC_CHANNELS.GET_SEGMENT_CUSTOMERS, async (event, { segmentId }) => {
    try {
      const segment = await CustomerSegment.findByPk(segmentId, {
        include: [{ model: Customer, as: 'customers' }]
      }) as CustomerSegmentWithCustomers | null;
      if (!segment) {
        return { success: false, message: 'Segment not found' };
      }
      return { success: true, customers: segment.customers };
    } catch (error) {
      return { success: false, message: 'Error fetching segment customers', error };
    }
  });

  // Assign customers to segment
  ipcMain.handle(IPC_CHANNELS.ASSIGN_CUSTOMERS, async (event, { segmentId, customerIds }) => {
    try {
      const segment = await CustomerSegment.findByPk(segmentId);
      if (!segment) {
        return { success: false, message: 'Segment not found' };
      }

      // Update customers' segment_id
      await Customer.update(
        { segment_id: segmentId },
        { 
          where: { id: { [Op.in]: customerIds } }
        }
      );

      return { success: true, message: 'Customers assigned successfully' };
    } catch (error) {
      return { success: false, message: 'Error assigning customers', error };
    }
  });

  // Update segment
  ipcMain.handle(IPC_CHANNELS.UPDATE_SEGMENT, async (event, { id, updates }) => {
    try {
      const segment = await CustomerSegment.findByPk(id);
      if (!segment) {
        return { success: false, message: 'Segment not found' };
      }
      await segment.update(updates);
      return { success: true, message: 'Segment updated successfully', segment };
    } catch (error) {
      return { success: false, message: 'Error updating segment', error };
    }
  });

  // Delete segment
  ipcMain.handle(IPC_CHANNELS.DELETE_SEGMENT, async (event, { id }) => {
    try {
      const segment = await CustomerSegment.findByPk(id);
      if (!segment) {
        return { success: false, message: 'Segment not found' };
      }

      // Remove segment_id from associated customers
      await Customer.update(
        { segment_id: null as unknown as string },  // Type cast to handle null
        { 
          where: { segment_id: id }
        }
      );

      await segment.destroy();
      return { success: true, message: 'Segment deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting segment', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
