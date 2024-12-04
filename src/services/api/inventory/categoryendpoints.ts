import { ipcMain } from 'electron';
import Category, { CategoryAttributes } from '../../../models/Category.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_CATEGORY: 'inventory:category:create',
  GET_ALL_CATEGORIES: 'inventory:category:get-all',
  GET_CATEGORY: 'inventory:category:get',
  UPDATE_CATEGORY: 'inventory:category:update',
  DELETE_CATEGORY: 'inventory:category:delete'
};

// Register IPC handlers
export function registerCategoryHandlers() {
  // Create category handler
  ipcMain.handle(IPC_CHANNELS.CREATE_CATEGORY, async (event, { data }) => {
    try {
      if (!data.businessId) {
        return { success: false, message: 'Business ID is required' };
      }

      const category = await Category.create(data);
      return { 
        success: true, 
        message: 'Category created successfully', 
        category 
      };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, message: 'Error creating category', error };
    }
  });

  // Get all categories for a business
  ipcMain.handle(IPC_CHANNELS.GET_ALL_CATEGORIES, async (event, { businessId }) => {
    try {
      if (!businessId) {
        return { success: false, message: 'Business ID is required' };
      }

      const categories = await Category.findAll({
        where: { businessId }
      });

      const plainCategories = categories.map(category => category.get({ plain: true }));
      return { success: true, categories: plainCategories };
    } catch (error) {
      console.error('Error fetching categories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message: 'Error fetching categories', error: errorMessage };
    }
  });

  // Get single category
  ipcMain.handle(IPC_CHANNELS.GET_CATEGORY, async (event, { id }) => {
    try {
      const category = await Category.findByPk(id, {
        include: ['products']
      });
      if (!category) {
        return { success: false, message: 'Category not found' };
      }
      return { success: true, category };
    } catch (error) {
      console.error('Error fetching category:', error);
      return { success: false, message: 'Error fetching category', error };
    }
  });

  // Update category
  ipcMain.handle(IPC_CHANNELS.UPDATE_CATEGORY, async (event, { id, updates }) => {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        return { success: false, message: 'Category not found' };
      }
      await category.update(updates);
      return { success: true, message: 'Category updated successfully', category };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, message: 'Error updating category', error };
    }
  });

  // Delete category
  ipcMain.handle(IPC_CHANNELS.DELETE_CATEGORY, async (event, { id }) => {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        return { success: false, message: 'Category not found' };
      }
      await category.destroy();
      return { success: true, message: 'Category deleted successfully' };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, message: 'Error deleting category', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
