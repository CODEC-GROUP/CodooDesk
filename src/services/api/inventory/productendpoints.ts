import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Op } from 'sequelize';
import Product, { ProductAttributes, ProductInstance } from '../../../models/Product.js';
import Shop from '../../../models/Shop.js';
import Category from '../../../models/Category.js';
import Supplier from '../../../models/Supplier.js';
import ProductVariant from '../../../models/ProductVariant.js';
import PriceHistory from '../../../models/PriceHistory.js';
import User from '../../../models/User.js';
import { sequelize } from '../../database/index.js';
import AuditLog from '../../../models/AuditLog.js';
import InventoryItem from '../../../models/InventoryItem.js';
import StockMovement from '../../../models/StockMovement.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_PRODUCT: 'inventory:product:create',
  GET_ALL_PRODUCTS: 'inventory:product:get-all',
  GET_PRODUCT: 'inventory:product:get',
  UPDATE_PRODUCT: 'inventory:product:update',
  DELETE_PRODUCT: 'inventory:product:delete',
  GET_BY_CATEGORY: 'inventory:product:get-by-category',
  GET_PRICE_HISTORY: 'inventory:product:price-history:get',
  GET_WITH_VARIANTS: 'inventory:product:get-with-variants'
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
      // Validate that we have a userId
      if (!data.userId) {
        throw new Error('User ID is required for creating a product');
      }

      // Verify the user exists
      const user = await User.findByPk(data.userId, { transaction: t });
      if (!user) {
        throw new Error('Invalid user ID provided');
      }

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
        purchasePrice: Number(data.purchasePrice),
        valuationMethod: data.valuationMethod || 'FIFO',
        hasExpiryDate: data.hasExpiryDate || false,
        hasBatchTracking: data.hasBatchTracking || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies Omit<ProductAttributes, 'id'>;

      // Create the product with sanitized data
      const product = await Product.create(sanitizedData, { transaction: t });

      // Handle supplier associations with array validation
      if (data.suppliers && Array.isArray(data.suppliers)) {
        // Validate supplier IDs exist
        const existingSuppliers = await Supplier.findAll({
          where: { id: data.suppliers },
          transaction: t
        });

        if (existingSuppliers.length !== data.suppliers.length) {
          const invalidIds = data.suppliers.filter((id: string) => 
            !existingSuppliers.some(s => s.id === id)
          );
          throw new Error(`Invalid supplier IDs: ${invalidIds.join(', ')}`);
        }

        await product.setSuppliers(data.suppliers);
      }

      // Create inventory item if warehouse is specified
      if (data.warehouseId) {
        // Create inventory item
        const inventoryItem = await InventoryItem.create({
          product_id: product.id,
          inventory_id: data.warehouseId,
          quantity: Number(data.quantity) || 0,
          unit_cost: Number(data.purchasePrice) || 0,
          selling_price: Number(data.sellingPrice) || 0,
          minimum_quantity: Number(data.reorderPoint) || 0,
          reorder_point: Number(data.reorderPoint) || 0,
          maximum_quantity: Number(data.quantity) * 2, // Set a reasonable maximum
          status: 'in_stock',
          stock_type: 'purchase',
          unit_type: 'piece',
          value: (Number(data.quantity) || 0) * (Number(data.purchasePrice) || 0)
        }, { transaction: t });

        // Create stock movement record
        await StockMovement.create({
          inventoryItem_id: inventoryItem.id,
          movementType: 'added',
          quantity: Number(data.quantity) || 0,
          reason: 'Initial stock on product creation',
          performedBy: data.userId, // Using userId as the performer
          source_inventory_id: data.warehouseId,
          destination_inventory_id: null,
          direction: 'inbound',
          cost_per_unit: Number(data.purchasePrice) || 0,
          total_cost: (Number(data.quantity) || 0) * (Number(data.purchasePrice) || 0),
          status: 'completed'
        }, { transaction: t });
      }

      // Create price history entry
      await PriceHistory.create({
        product_id: product.id,
        old_price: 0, // Initial price, no old price
        new_price: Number(data.sellingPrice) || 0,
        change_date: new Date(),
        change_reason: 'Initial price on product creation',
        changed_by: data.userId, // Use userId instead of businessId
        price_type: 'selling'
      }, { transaction: t });

      // Create price history for purchase price
      await PriceHistory.create({
        product_id: product.id,
        old_price: 0, // Initial price, no old price
        new_price: Number(data.purchasePrice) || 0,
        change_date: new Date(),
        change_reason: 'Initial price on product creation',
        changed_by: data.userId, // Use userId instead of businessId
        price_type: 'purchase'
      }, { transaction: t });

      // Create audit log entry
      await AuditLog.create({
        shopId: data.shop_id,
        userId: data.userId, // Use userId here as well for consistency
        action: 'create',
        entityType: 'product',
        entityId: product.id,
        newState: {
          name: data.name,
          description: data.description,
          sku: data.sku,
          category_id: data.category_id,
          shop_id: data.shop_id,
          status: data.status,
          quantity: data.quantity,
          selling_price: data.sellingPrice,
          purchase_price: data.purchasePrice
        },
        changes: {
          name: { old: null, new: data.name },
          description: { old: null, new: data.description },
          sku: { old: null, new: data.sku },
          category_id: { old: null, new: data.category_id },
          shop_id: { old: null, new: data.shop_id },
          status: { old: null, new: data.status },
          quantity: { old: 0, new: Number(data.quantity) || 0 },
          selling_price: { old: 0, new: Number(data.sellingPrice) || 0 },
          purchase_price: { old: 0, new: Number(data.purchasePrice) || 0 }
        },
        status: 'success',
        performedAt: new Date()
      }, { transaction: t });

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
  ipcMain.handle(IPC_CHANNELS.GET_ALL_PRODUCTS, async (event: IpcMainInvokeEvent, { shopIds, businessId }) => {
    try {
      const whereClause: any = { 
        '$shop.businessId$': businessId,
        shop_id: shopIds?.length ? { [Op.in]: shopIds } : undefined 
      };

      const products = await Product.findAll({
        where: whereClause,
        include: [
          {
            model: Shop,
            as: 'shop',
            attributes: ['id', 'name', 'businessId']
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'description', 'image', 'businessId']
          },
          {
            model: Supplier,
            as: 'suppliers',
            through: { attributes: [] },
            attributes: ['id', 'name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return {
        success: true,
        products: products.map(sanitizeProduct)
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch products'
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

  // Update product handler with price history tracking
  ipcMain.handle(IPC_CHANNELS.UPDATE_PRODUCT, async (event, { id, updates, userId }) => {
    const t = await sequelize.transaction();
    try {
      const product = await Product.findByPk(id, { transaction: t });
      if (!product) {
        return { success: false, message: 'Product not found' };
      }

      // Track price changes if selling price or purchase price is updated
      if (updates.sellingPrice !== undefined && updates.sellingPrice !== product.sellingPrice) {
        await PriceHistory.create({
          product_id: id,
          old_price: product.sellingPrice,
          new_price: updates.sellingPrice,
          changed_by: userId,
          price_type: 'selling',
          change_date: new Date()
        }, { transaction: t });
      }

      if (updates.purchasePrice !== undefined && updates.purchasePrice !== product.purchasePrice) {
        await PriceHistory.create({
          product_id: id,
          old_price: product.purchasePrice,
          new_price: updates.purchasePrice,
          changed_by: userId,
          price_type: 'purchase',
          change_date: new Date()
        }, { transaction: t });
      }

      await product.update(updates, { transaction: t });
      await t.commit();

      const updatedProduct = await sanitizeProduct(product);
      return { success: true, product: updatedProduct };
    } catch (error) {
      await t.rollback();
      return { success: false, message: 'Failed to update product', error };
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

  // Get product with variants
  ipcMain.handle(IPC_CHANNELS.GET_WITH_VARIANTS, async (event, { id }) => {
    try {
      const product = await Product.findByPk(id, {
        include: [
          { model: Category, as: 'category' },
          { model: Shop, as: 'shop' },
          { model: Supplier, as: 'suppliers' },
          { 
            model: ProductVariant,
            as: 'variants',
            required: false
          }
        ]
      });

      if (!product) {
        return { success: false, message: 'Product not found' };
      }

      const sanitizedProduct = await sanitizeProduct(product);
      return { success: true, product: sanitizedProduct };
    } catch (error) {
      return { success: false, message: 'Failed to fetch product', error };
    }
  });

  // Get price history
  ipcMain.handle(IPC_CHANNELS.GET_PRICE_HISTORY, async (event, { productId, priceType }) => {
    try {
      const whereClause: any = { product_id: productId };
      if (priceType) {
        whereClause.price_type = priceType;
      }

      const priceHistory = await PriceHistory.findAll({
        where: whereClause,
        order: [['change_date', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      return { success: true, priceHistory };
    } catch (error) {
      return { success: false, message: 'Failed to fetch price history', error };
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
          attributes: ['businessId']
        }],
        transaction: t
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
