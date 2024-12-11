import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Op } from 'sequelize';
import Product, { ProductAttributes, ProductInstance } from '../../../models/Product.js';
import Shop from '../../../models/Shop.js';
import Category from '../../../models/Category.js';
import Supplier from '../../../models/Supplier.js';
import { sequelize } from '../../database/index.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_PRODUCT: 'inventory:product:create',
  GET_ALL_PRODUCTS: 'inventory:product:get-all',
  GET_PRODUCT: 'inventory:product:get',
  UPDATE_PRODUCT: 'inventory:product:update',
  DELETE_PRODUCT: 'inventory:product:delete',
  GET_BY_CATEGORY: 'inventory:product:get-by-category'
};

// Types for sanitized data
interface SanitizedSupplier {
  id: string;
  name: string;
}

interface SanitizedCategory {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  businessId: string;
}

interface SanitizedShop {
  id: string;
  name: string;
  businessId: string;
  locationId: string;
  status: string;
  type: string;
  contactInfo: {
    email: string;
    [key: string]: any;
  };
}

interface SanitizedProduct extends Omit<ProductAttributes, 'category' | 'shop' | 'suppliers'> {
  suppliers: SanitizedSupplier[];
  category: SanitizedCategory | null;
  shop: SanitizedShop | null;
}

// Helper function to sanitize a product
function sanitizeProduct(product: any): SanitizedProduct {
  const plain = product?.get?.({ plain: true }) ?? product;
  
  return {
    ...plain,
    suppliers: plain?.suppliers?.map((supplier: any) => ({
      id: supplier.id,
      name: supplier.name
    })) || [],
    category: plain?.category ? {
      id: plain.category.id,
      name: plain.category.name,
      description: plain.category.description ?? null,
      image: plain.category.image ?? null,
      businessId: plain.category.businessId
    } : null,
    shop: plain?.shop ? {
      id: plain.shop.id,
      name: plain.shop.name,
      businessId: plain.shop.businessId ?? '',
      locationId: plain.shop.locationId ?? '',
      status: plain.shop.status ?? 'inactive',
      type: plain.shop.type ?? '',
      contactInfo: plain.shop.contactInfo ?? { email: '' }
    } : null
  };
}

// Register IPC handlers
export function registerProductHandlers() {
  // Create product handler
  ipcMain.handle(IPC_CHANNELS.CREATE_PRODUCT, async (event: IpcMainInvokeEvent, { data, businessId }) => {
    const t = await sequelize.transaction();
    
    try {
      // Sanitize and prepare data according to ProductAttributes
      const sanitizedData = {
        name: data.name,
        description: data.description || null,
        sellingPrice: Number(data.sellingPrice),
        category_id: data.category_id || null,
        shop_id: data.shop_id,
        unitType: data.productType || 'physical',
        featuredImage: data.featuredImage || null,
        additionalImages: Array.isArray(data.additionalImages) ? data.additionalImages : [],
        status: 'high_stock',
        quantity: Number(data.quantity) || 0,
        reorderPoint: Number(data.reorderPoint) || 10,
        purchasePrice: Number(data.purchasePrice)
      } satisfies Omit<ProductAttributes, 'id' | 'createdAt' | 'updatedAt'>;

      // Create the product with sanitized data
      const product = await Product.create(sanitizedData, { transaction: t });

      // Handle supplier associations separately
      if (data.suppliers && Array.isArray(data.suppliers)) {
        await product.setSuppliers(data.suppliers);
      }

      await t.commit();

      return {
        success: true,
        product: sanitizeProduct(product),
        message: 'Product created successfully'
      };

    } catch (error) {
      await t.rollback();
      console.error('Error creating product:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create product'
      };
    }
  });

  // Get all products handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_PRODUCTS, async (event: IpcMainInvokeEvent, { shopId, shopIds, businessId }) => {
    console.log('=== GET_ALL_PRODUCTS START ===');
    console.log('Params:', { shopId, shopIds, businessId });
    
    try {
      if (!businessId) {
        console.log('Error: Business ID is missing');
        throw new Error('Business ID is required');
      }

      // Create where clause with business ID
      let whereClause: any = {};
      
      // Handle shop IDs
      if (shopIds?.length > 0) {
        whereClause = {
          shop_id: { [Op.in]: shopIds },
          '$shop.businessId$': businessId
        };
      } else if (shopId) {
        whereClause = {
          shop_id: shopId,
          '$shop.businessId$': businessId
        };
      } else {
        throw new Error('Either shopId or shopIds is required');
      }

      console.log('Final where clause:', JSON.stringify(whereClause, null, 2));

      console.log('Executing Product.findAll...');
      const products = await Product.findAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'description', 'image', 'businessId']
          },
          {
            model: Shop,
            as: 'shop',
            required: true,
            attributes: ['id', 'name', 'businessId', 'locationId', 'status', 'type', 'contactInfo'],
            where: { businessId } // Additional filter on shop level
          },
          {
            model: Supplier,
            as: 'suppliers',
            through: { attributes: [] },
            attributes: ['id', 'name']
          }
        ],
        logging: (sql) => console.log('Executing SQL:', sql),
        order: [['createdAt', 'DESC']]
      });

      console.log(`Found ${products.length} products`);
      if (products.length > 0) {
        console.log('First product sample:', JSON.stringify(products[0].get({ plain: true }), null, 2));
      }

      // Convert to plain objects and sanitize the response
      const sanitizedProducts = products.map(product => sanitizeProduct(product));
      console.log(`Sanitized ${sanitizedProducts.length} products`);

      console.log('=== GET_ALL_PRODUCTS END ===');
      return { success: true, products: sanitizedProducts };
    } catch (error) {
      console.error('Error in GET_ALL_PRODUCTS:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error fetching products'
      };
    }
  });

  // Get product by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_PRODUCT, async (event: IpcMainInvokeEvent, { id }) => {
    try {
      const product = await Product.findByPk(id, {
        include: ['category']
      });
      if (!product) {
        return { success: false, message: 'Product not found' };
      }
      return { success: true, product: sanitizeProduct(product) };
    } catch (error) {
      return { success: false, message: 'Error retrieving product', error };
    }
  });

  // Update product handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_PRODUCT, async (event: IpcMainInvokeEvent, { productId, data, businessId }) => {
    try {
      if (!businessId || !productId) {
        return { success: false, message: 'Business ID and Product ID are required' };
      }

      const product = await Product.findOne({
        where: {
          id: productId,
          '$shop.businessId$': businessId
        },
        include: [{
          model: Shop,
          as: 'shop',
          required: true
        }]
      });

      if (!product) {
        return { success: false, message: 'Product not found or access denied' };
      }

      // Calculate new status based on quantity and reorder point
      const newStatus = (data.quantity <= (data.reorderPoint || product.reorderPoint) ? 'low_stock' :
                       data.quantity <= (data.reorderPoint || product.reorderPoint) * 2 ? 'medium_stock' : 
                       'high_stock') as 'low_stock' | 'medium_stock' | 'high_stock' | 'out_of_stock';

      // Sanitize and prepare update data
      const updateData = {
        name: data.name,
        sku: data.sku,
        sellingPrice: Number(data.sellingPrice),
        quantity: Number(data.quantity),
        description: data.description,
        category_id: data.category_id,
        shop_id: data.shop_id,
        status: newStatus,
        unitType: data.unitType,
        purchasePrice: Number(data.purchasePrice),
        featuredImage: data.featuredImage,
        additionalImages: Array.isArray(data.additionalImages) ? data.additionalImages : [],
        reorderPoint: Number(data.reorderPoint)
      };

      await product.update(updateData);

      // Handle supplier associations if provided
      if (data.suppliers && Array.isArray(data.suppliers)) {
        await product.setSuppliers(data.suppliers);
      }

      // Fetch updated product with all associations
      const updatedProduct = await Product.findByPk(product.id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'description', 'image', 'businessId']
          },
          {
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name', 'businessId', 'locationId', 'status', 'type', 'contactInfo']
          },
          {
            model: Supplier,
            as: 'suppliers',
            through: { attributes: [] },
            attributes: ['id', 'name']
          }
        ]
      });

      return { 
        success: true, 
        message: 'Product updated successfully',
        product: sanitizeProduct(updatedProduct)
      };

    } catch (error) {
      console.error('Error updating product:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error updating product'
      };
    }
  });

  // Get products by category handler
  ipcMain.handle(IPC_CHANNELS.GET_BY_CATEGORY, async (event: IpcMainInvokeEvent, { categoryId, shop_id }) => {
    try {
      const products = await Product.findAll({
        where: { 
          category_id: categoryId,
          shop_id 
        },
        include: ['category'],
        order: [['createdAt', 'DESC']]
      });
      return { success: true, products: products.map(product => sanitizeProduct(product)) };
    } catch (error) {
      return { success: false, message: 'Error fetching products by category', error };
    }
  });

  // Delete product handler
  ipcMain.handle(IPC_CHANNELS.DELETE_PRODUCT, async (event: IpcMainInvokeEvent, { productId, businessId }) => {
    const t = await sequelize.transaction();
    
    try {
      if (!businessId || !productId) {
        return { success: false, message: 'Business ID and Product ID are required' };
      }

      // Find product with business verification
      const product = await Product.findOne({
        where: {
          id: productId,
          '$shop.businessId$': businessId
        },
        include: [{
          model: Shop,
          as: 'shop',
          required: true
        }]
      });

      if (!product) {
        return { success: false, message: 'Product not found or access denied' };
      }

      // Remove all associations first
      await Promise.all([
        // Clear supplier associations
        product.setSuppliers([]),
        // Add other association clearings here if needed
      ]);
      
      // Delete the product
      await product.destroy({ transaction: t });

      await t.commit();

      return { 
        success: true, 
        message: 'Product deleted successfully',
        productId
      };

    } catch (error) {
      await t.rollback();
      console.error('Error deleting product:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error deleting product'
      };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
