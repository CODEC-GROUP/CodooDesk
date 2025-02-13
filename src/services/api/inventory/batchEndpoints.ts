import { ipcMain } from 'electron';
import { Op } from 'sequelize';
import { BatchTracking, Product, Supplier } from '../../../models/index.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_BATCH: 'inventory:batch:create',
  GET_PRODUCT_BATCHES: 'inventory:batch:get-by-product',
  UPDATE_BATCH: 'inventory:batch:update',
  DELETE_BATCH: 'inventory:batch:delete',
  GET_EXPIRING_BATCHES: 'inventory:batch:get-expiring'
};

export function registerBatchHandlers() {
  // Create batch handler
  ipcMain.handle(IPC_CHANNELS.CREATE_BATCH, async (event, batchData) => {
    try {
      const batch = await BatchTracking.create(batchData);
      
      // Update product total quantity
      const product = await Product.findByPk(batchData.product_id);
      if (product) {
        await product.update({
          quantity: product.quantity + batchData.quantity
        });
      }
      
      return { success: true, message: 'Batch created successfully', batch };
    } catch (error) {
      return { success: false, message: 'Error creating batch', error };
    }
  });

  // Get all batches for a product
  ipcMain.handle(IPC_CHANNELS.GET_PRODUCT_BATCHES, async (event, { productId }) => {
    try {
      const batches = await BatchTracking.findAll({
        where: { product_id: productId },
        include: [
          { model: Product, as: 'product' },
          { model: Supplier, as: 'supplier' }
        ]
      });
      return { success: true, batches };
    } catch (error) {
      return { success: false, message: 'Error fetching batches', error };
    }
  });

  // Get expiring batches
  ipcMain.handle(IPC_CHANNELS.GET_EXPIRING_BATCHES, async (event, { days = 30 }) => {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      const batches = await BatchTracking.findAll({
        where: {
          expiry_date: {
            [Op.lte]: expiryDate,
            [Op.gt]: new Date()
          },
          status: 'active'
        },
        include: [
          { model: Product, as: 'product' },
          { model: Supplier, as: 'supplier' }
        ]
      });
      return { success: true, batches };
    } catch (error) {
      return { success: false, message: 'Error fetching expiring batches', error };
    }
  });

  // Update batch
  ipcMain.handle(IPC_CHANNELS.UPDATE_BATCH, async (event, { id, updates }) => {
    try {
      const batch = await BatchTracking.findByPk(id);
      if (!batch) {
        return { success: false, message: 'Batch not found' };
      }

      const oldQuantity = batch.quantity;
      await batch.update(updates);

      // Update product total quantity if batch quantity changed
      if (updates.quantity && oldQuantity !== updates.quantity) {
        const product = await Product.findByPk(batch.product_id);
        if (product) {
          await product.update({
            quantity: product.quantity - oldQuantity + updates.quantity
          });
        }
      }

      return { success: true, message: 'Batch updated successfully', batch };
    } catch (error) {
      return { success: false, message: 'Error updating batch', error };
    }
  });

  // Delete batch
  ipcMain.handle(IPC_CHANNELS.DELETE_BATCH, async (event, { id }) => {
    try {
      const batch = await BatchTracking.findByPk(id);
      if (!batch) {
        return { success: false, message: 'Batch not found' };
      }

      // Update product total quantity
      const product = await Product.findByPk(batch.product_id);
      if (product) {
        await product.update({
          quantity: product.quantity - batch.quantity
        });
      }

      await batch.destroy();
      return { success: true, message: 'Batch deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting batch', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
