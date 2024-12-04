import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Op } from 'sequelize';
import Product, { ProductAttributes, ProductInstance } from '../../../models/Product.js';
import Shop from '../../../models/Shop.js';
import Category from '../../../models/Category.js';
import Supplier from '../../../models/Supplier.js';

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
  ipcMain.handle(IPC_CHANNELS.CREATE_PRODUCT, async (event: IpcMainInvokeEvent, { data }) => {
    try {
      if (!data.businessId) {
        return { success: false, message: 'Business ID is required' };
      }

      // Sanitize the input data to ensure it's serializable
      const sanitizedData = {
        name: data.name,
        sku: data.sku,
        sellingPrice: Number(data.sellingPrice),
        quantity: Number(data.quantity),
        description: data.description,
        category_id: data.category_id,
        shop_id: data.shop_id,
        status: (data.quantity <= data.reorderPoint ? 'low_stock' : 
                data.quantity <= data.reorderPoint * 2 ? 'medium_stock' : 
                'high_stock') as 'low_stock' | 'medium_stock' | 'high_stock' | 'out_of_stock',
        unitType: data.unitType,
        purchasePrice: Number(data.purchasePrice),
        featuredImage: data.featuredImage,
        additionalImages: Array.isArray(data.additionalImages) ? data.additionalImages : [],
        reorderPoint: Number(data.reorderPoint),
        businessId: data.businessId
      };

      // Create the product with sanitized data
      const product = await Product.create(sanitizedData);

      // Handle supplier associations separately
      if (data.suppliers && Array.isArray(data.suppliers)) {
        await product.addSuppliers(data.suppliers);
      }

      // Fetch the product with associations, but sanitize the response
      const productWithAssociations = await Product.findByPk(product.id, {
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

      // Sanitize the response to ensure it's serializable
      const sanitizedProduct = sanitizeProduct(productWithAssociations);

      return { 
        success: true, 
        message: 'Product created successfully', 
        product: sanitizedProduct
      };
    } catch (error) {
      console.error('Error creating product:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error creating product'
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
  ipcMain.handle(IPC_CHANNELS.UPDATE_PRODUCT, async (event: IpcMainInvokeEvent, { id, updates }) => {
    try {
      const product = await Product.findByPk(id);
      if (!product) {
        return { success: false, message: 'Product not found' };
      }
      
      // Update status based on new quantity if it's being updated
      if (updates.quantity !== undefined) {
        updates.status = updates.quantity <= (product.reorderPoint ?? 10) ? 'low_stock' :
                        updates.quantity <= (product.reorderPoint ?? 10) * 2 ? 'medium_stock' : 
                        'high_stock';
      }
      
      await product.update(updates);
      return { success: true, message: 'Product updated successfully', product: sanitizeProduct(product) };
    } catch (error) {
      return { success: false, message: 'Error updating product', error };
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
  ipcMain.handle(IPC_CHANNELS.DELETE_PRODUCT, async (event: IpcMainInvokeEvent, { id }) => {
    try {
      const product = await Product.findByPk(id);
      if (!product) {
        return { success: false, message: 'Product not found' };
      }
      await product.destroy();
      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting product', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
