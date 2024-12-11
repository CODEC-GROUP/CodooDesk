import { ipcMain } from 'electron';
import Category, { CategoryAttributes } from '../../../models/Category.js';
import { sequelize } from '../../database/index.js';
import { unlink } from 'fs/promises';
import path from 'path';

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
  ipcMain.handle(IPC_CHANNELS.UPDATE_CATEGORY, async (event, { categoryId, data }) => {
    const t = await sequelize.transaction();

    try {
      const category = await Category.findByPk(categoryId, { transaction: t });
      if (!category) {
        await t.rollback();
        return { success: false, message: 'Category not found' };
      }

      // If there's a new image and an old image exists, delete the old one
      if (data.image && category.image && category.image !== data.image) {
        try {
          const oldImagePath = path.resolve(category.image);
          await unlink(oldImagePath);
        } catch (error) {
          console.error('Error deleting old image:', error);
          // Continue with update even if image deletion fails
        }
      }

      await category.update({
        name: data.name,
        description: data.description,
        image: data.image,
        businessId: data.businessId
      }, { transaction: t });

      await t.commit();

      // Fetch updated category with any related data
      const updatedCategory = await Category.findByPk(categoryId, {
        include: ['products']
      });

      return { 
        success: true, 
        message: 'Category updated successfully', 
        category: updatedCategory?.get({ plain: true }) 
      };
    } catch (error) {
      await t.rollback();
      console.error('Error updating category:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error updating category' 
      };
    }
  });

  // Delete category
  ipcMain.handle(IPC_CHANNELS.DELETE_CATEGORY, async (event, { id }) => {
    const t = await sequelize.transaction();

    try {
      const category = await Category.findByPk(id, { transaction: t });
      if (!category) {
        await t.rollback();
        return { success: false, message: 'Category not found' };
      }

      // Delete associated image if it exists
      if (category.image) {
        try {
          const imagePath = path.resolve(category.image);
          await unlink(imagePath);
        } catch (error) {
          console.error('Error deleting category image:', error);
          // Continue with deletion even if image deletion fails
        }
      }

      await category.destroy({ transaction: t });
      await t.commit();
      
      return { success: true, message: 'Category deleted successfully' };
    } catch (error) {
      await t.rollback();
      console.error('Error deleting category:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error deleting category' 
      };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
