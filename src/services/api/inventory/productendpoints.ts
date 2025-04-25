import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Op } from 'sequelize';
import Product, { ProductAttributes, ProductInstance } from '../../../models/Product.js';
import Shop from '../../../models/Shop.js';
import Category from '../../../models/Category.js';
import ProductVariant from '../../../models/ProductVariant.js';
import PriceHistory from '../../../models/PriceHistory.js';
import User from '../../../models/User.js';
import AuditLog from '../../../models/AuditLog.js';
import InventoryItem from '../../../models/InventoryItem.js';
import StockMovement from '../../../models/StockMovement.js';
import BatchTracking from '../../../models/BatchTracking.js';
import Expense from '../../../models/Expense.js';
import OhadaCode from '../../../models/OhadaCode.js';
import { sequelize } from '../../database/index.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_PRODUCT: 'inventory:product:create',
  GET_ALL_PRODUCTS: 'inventory:product:get-all',
  GET_PRODUCT: 'inventory:product:get',
  UPDATE_PRODUCT: 'inventory:product:update',
  DELETE_PRODUCT: 'inventory:product:delete',
  GET_BY_CATEGORY: 'inventory:product:get-by-category',
  GET_PRICE_HISTORY: 'inventory:product:price-history:get',
  GET_WITH_VARIANTS: 'inventory:product:get-with-variants',
  GET_ALL_WITH_INVENTORIES: 'inventory:product:get-all-with-inventories'
};

// Types for sanitized data
interface SanitizedCategory {
  id: string;
  name: string;
}

interface SanitizedShop {
  id: string;
  name: string;
}

interface SanitizedProduct extends Omit<ProductAttributes, 'category' | 'shop'> {
  category?: {
    id: number;
    name: string;
  } | null;
  shop?: {
    id: number;
    name: string;
  } | null;
}

// Helper function to sanitize a product
function sanitizeProduct(product: any): SanitizedProduct {
  const plain = product?.get?.({ plain: true }) ?? product;
  
  return {
    ...plain,
    category: plain?.category ? {
      id: plain.category.id,
      name: plain.category.name,
    } : null,
    shop: plain?.shop ? {
      id: plain.shop.id,
      name: plain.shop.name,
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

      // Create inventory item if warehouse is specified
      if (data.warehouseId) {
        // Create inventory item
        const inventoryItem = await InventoryItem.create({
          product_id: product.id,
          inventory_id: data.warehouseId,
          item_number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          quantity_supplied: Number(data.quantity) || 0,
          cost_price: Number(data.purchasePrice) || 0,
          selling_price: Number(data.sellingPrice) || 0,
          quantity_sold: 0,
          returned_to_shop: 0,
          returned_to_supplier: 0,
          quantity_left: Number(data.quantity) || 0,
          amount_sold: 0,
          reorder_point: Number(data.reorderPoint) || 0,
          unit_cost: Number(data.purchasePrice) || 0,
          status: 'in_stock',
          unit_type: 'piece'
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

      /* 
      // Removing automatic expense creation as requested
      // Calculate total expense amount
      const totalExpenseAmount = Number(data.purchasePrice) * Number(data.quantity);

      // Only create expense entry if there's an actual expense (quantity > 0)
      if (totalExpenseAmount > 0) {
        // Fetch the OHADA code for inventory purchases (usually 601 or 602)
        const ohadaCode = await OhadaCode.findOne({ 
          where: { code: '601' }, // "Purchases of goods" code
          transaction: t 
        });

        if (!ohadaCode) {
          console.warn('Inventory purchase OHADA code not found, expense record not created');
        } else {
          // Create expense entry for the inventory purchase
          await Expense.create({
            date: new Date(),
            description: `Inventory purchase - ${data.name} (${data.quantity} units)`,
            amount: totalExpenseAmount,
            paymentMethod: 'cash', // Default payment method, could be made configurable
            ohadaCodeId: ohadaCode.id,
            shopId: data.shop_id,
            userId: data.userId,
            status: 'completed'
          }, { transaction: t });
        }
      }
      */

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

  // Get all products with their inventory information
  ipcMain.handle(IPC_CHANNELS.GET_ALL_WITH_INVENTORIES, async (event: IpcMainInvokeEvent, { shopIds, businessId, includeInventories = true }) => {
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
        ],
        order: [['createdAt', 'DESC']]
      });

      // Convert products to plain objects to avoid circular references
      const plainProducts = products.map(product => product.get({ plain: true }));

      // If we need to include inventory information
      if (includeInventories) {
        // Get all product IDs and filter out any undefined values
        const productIds = plainProducts
          .map(p => p.id)
          .filter((id): id is string => id !== undefined);
        
        // Only proceed if we have valid product IDs
        if (productIds.length > 0) {
          // Fetch inventory items for these products
          const inventoryItems = await InventoryItem.findAll({
            where: {
              product_id: { [Op.in]: productIds }
            },
            include: [
              {
                model: sequelize.models.Inventory,
                as: 'inventory',
                attributes: ['id', 'name', 'description', 'shopId']
              }
            ]
          });

          // Convert inventory items to plain objects
          const plainInventoryItems = inventoryItems.map(item => item.get({ plain: true }));

          // Group inventory items by product ID
          const inventoryByProduct = plainInventoryItems.reduce((acc, item) => {
            if (!acc[item.product_id]) {
              acc[item.product_id] = [];
            }
            acc[item.product_id].push(item);
            return acc;
          }, {} as Record<string, any[]>);

          // Add inventory items to each product
          const productsWithInventory = plainProducts.map(product => {
            const productWithRelations = product as unknown as ProductInstance;
            const sanitizedProduct = {
              ...product,
              category: (productWithRelations as ProductInstance).category ? {
                id: (productWithRelations as ProductInstance).category!.id,
                name: (productWithRelations as ProductInstance).category!.name,
                description: (productWithRelations as ProductInstance).category!.description ?? null,
                image: (productWithRelations as ProductInstance).category!.image ?? null,
                businessId: (productWithRelations as ProductInstance).category!.businessId
              } : null,
              shop: (productWithRelations as ProductInstance).shop ? {
                id: (productWithRelations as ProductInstance).shop!.id,
                name: (productWithRelations as ProductInstance).shop!.name,
                businessId: (productWithRelations as ProductInstance).shop!.businessId ?? '',
                locationId: (productWithRelations as ProductInstance).shop!.locationId ?? '',
                status: (productWithRelations as ProductInstance).shop!.status ?? 'inactive',
                type: (productWithRelations as ProductInstance).shop!.type ?? '',
                contactInfo: (productWithRelations as ProductInstance).shop!.contactInfo ?? { email: '' }
              } : null
            };
            
            return {
              ...sanitizedProduct,
              inventories: product.id !== undefined ? inventoryByProduct[product.id] || [] : []
            };
          });

          return {
            success: true,
            products: productsWithInventory
          };
        }
      }

      // If we don't need inventory information or have no valid product IDs, just sanitize the products
      return {
        success: true,
        products: plainProducts.map(product => ({
          ...product,
          category: (product as ProductInstance).category ? {
            id: (product as ProductInstance).category!.id,
            name: (product as ProductInstance).category!.name,
            description: (product as ProductInstance).category!.description ?? null,
            image: (product as ProductInstance).category!.image ?? null,
            businessId: (product as ProductInstance).category!.businessId
          } : null,
          shop: (product as ProductInstance).shop ? {
            id: (product as ProductInstance).shop!.id,
            name: (product as ProductInstance).shop!.name,
            businessId: (product as ProductInstance).shop!.businessId ?? '',
            locationId: (product as ProductInstance).shop!.locationId ?? '',
            status: (product as ProductInstance).shop!.status ?? 'inactive',
            type: (product as ProductInstance).shop!.type ?? '',
            contactInfo: (product as ProductInstance).shop!.contactInfo ?? { email: '' }
          } : null,
          inventories: [] // Return empty inventories array if we couldn't fetch them
        }))
      };
    } catch (error) {
      console.error('Error fetching products with inventories:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch products with inventories'
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

      // Check if quantity is being increased
      if (updates.quantity !== undefined && updates.quantity > product.quantity) {
        const quantityIncrease = updates.quantity - product.quantity;
        const purchasePrice = updates.purchasePrice !== undefined ? updates.purchasePrice : product.purchasePrice;
        const expenseAmount = purchasePrice * quantityIncrease;

        /* 
        // Removing automatic expense creation as requested
        // Only create expense if there's an actual increase in quantity
        if (quantityIncrease > 0 && expenseAmount > 0) {
          // Fetch the OHADA code for inventory purchases
          const ohadaCode = await OhadaCode.findOne({ 
            where: { code: '601' }, // "Purchases of goods" code
            transaction: t 
          });

          if (ohadaCode) {
            // Create expense entry for the additional inventory
            await Expense.create({
              date: new Date(),
              description: `Additional inventory - ${product.name} (${quantityIncrease} units)`,
              amount: expenseAmount,
              paymentMethod: 'cash', // Default payment method
              ohadaCodeId: ohadaCode.id,
              shopId: product.shop_id,
              userId: userId,
              status: 'completed'
            }, { transaction: t });
          } else {
            console.warn('Inventory purchase OHADA code not found, expense record not created');
          }
        }
        */
      }

      await product.update(updates, { transaction: t });
      await t.commit();

      const updatedProduct = await sanitizeProduct(product);
      return { success: true, product: updatedProduct };
    } catch (error) {
      await t.rollback();
      console.error('Error updating product:', error);
      return { 
        success: false, 
        message: error instanceof Error ? 
          `Failed to update product: ${error.message}` : 
          'Failed to update product'
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

  // Get product with variants
  ipcMain.handle(IPC_CHANNELS.GET_WITH_VARIANTS, async (event, { id }) => {
    try {
      const product = await Product.findByPk(id, {
        include: [
          { model: Category, as: 'category' },
          { model: Shop, as: 'shop' },
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

      // Find all related inventory items
      const inventoryItems = await InventoryItem.findAll({
        where: { product_id: productId },
        transaction: t
      });

      // Delete all related stock movements for each inventory item
      for (const item of inventoryItems) {
        await StockMovement.destroy({
          where: { inventoryItem_id: item.id },
          transaction: t
        });
      }

      // Delete all inventory items
      await InventoryItem.destroy({
        where: { product_id: productId },
        transaction: t
      });

      // Delete product variants
      await ProductVariant.destroy({
        where: { product_id: productId },
        transaction: t
      });

      // Delete batch tracking records
      await BatchTracking.destroy({
        where: { product_id: productId },
        transaction: t
      });

      // Delete price history records
      await PriceHistory.destroy({
        where: { product_id: productId },
        transaction: t
      });

      // Delete audit logs related to this product
      await AuditLog.destroy({
        where: { 
          entityType: 'product',
          entityId: productId
        },
        transaction: t
      });

      // Remove all associations first
      await Promise.all([
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
        message: error instanceof Error ? 
          `Failed to delete product: ${error.message}` : 
          'Error deleting product'
      };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
