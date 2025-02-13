import { ipcMain } from 'electron';
import ProductVariant from '../../../models/ProductVariant.js';
import Product from '../../../models/Product.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_VARIANT: 'inventory:variant:create',
  GET_VARIANTS: 'inventory:variant:get-all',
  UPDATE_VARIANT: 'inventory:variant:update',
  DELETE_VARIANT: 'inventory:variant:delete',
  GET_PRODUCT_VARIANTS: 'inventory:variant:get-by-product'
};

export function registerVariantHandlers() {
  // Create variant handler
  ipcMain.handle(IPC_CHANNELS.CREATE_VARIANT, async (event, variantData) => {
    try {
      const variant = await ProductVariant.create(variantData);
      return { success: true, message: 'Variant created successfully', variant };
    } catch (error) {
      return { success: false, message: 'Error creating variant', error };
    }
  });

  // Get all variants for a product
  ipcMain.handle(IPC_CHANNELS.GET_PRODUCT_VARIANTS, async (event, { productId }) => {
    try {
      const variants = await ProductVariant.findAll({
        where: { product_id: productId },
        include: [{ model: Product, as: 'product' }]
      });
      return { success: true, variants };
    } catch (error) {
      return { success: false, message: 'Error fetching variants', error };
    }
  });

  // Update variant
  ipcMain.handle(IPC_CHANNELS.UPDATE_VARIANT, async (event, { id, updates }) => {
    try {
      const variant = await ProductVariant.findByPk(id);
      if (!variant) {
        return { success: false, message: 'Variant not found' };
      }
      await variant.update(updates);
      return { success: true, message: 'Variant updated successfully', variant };
    } catch (error) {
      return { success: false, message: 'Error updating variant', error };
    }
  });

  // Delete variant
  ipcMain.handle(IPC_CHANNELS.DELETE_VARIANT, async (event, { id }) => {
    try {
      const variant = await ProductVariant.findByPk(id);
      if (!variant) {
        return { success: false, message: 'Variant not found' };
      }
      await variant.destroy();
      return { success: true, message: 'Variant deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting variant', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
