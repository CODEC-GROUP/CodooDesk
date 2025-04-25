import { ipcMain } from 'electron';
import InventoryItem, { InventoryItemAttributes } from '../../../models/InventoryItem.js';
import Inventory from '../../../models/Inventory.js';
import Product from '../../../models/Product.js';
import Supplier from '../../../models/Supplier.js';
import { Op, Sequelize } from 'sequelize';
import StockMovement from '../../../models/StockMovement.js';
import { sequelize } from '../../database/index.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_ITEM: 'inventory:item:create',
  GET_ALL_ITEMS_BY_INVENTORY_ID: 'inventory:item:get-all-by-inventory-id',
  GET_ITEM: 'inventory:item:get',
  UPDATE_ITEM: 'inventory:item:update',
  DELETE_ITEM: 'inventory:item:delete',
  SEARCH_PRODUCTS: 'inventory:product:search',
};

// Register IPC handlers
export function registerInventoryItemHandlers() {
  // Create inventory item handler
  ipcMain.handle(IPC_CHANNELS.CREATE_ITEM, async (event, { itemData }) => {
    const t = await sequelize.transaction();
    try {
      console.log('Received itemData:', itemData);

      // Validate required fields
      if (!itemData.product_id) {
        console.log('Missing product_id. Full itemData:', itemData);
        throw new Error('Product ID is required');
      }
      if (!itemData.inventory_id) throw new Error('Inventory ID is required');
      if (!itemData.quantity || itemData.quantity <= 0) throw new Error('Valid quantity is required');
      if (!itemData.unit_cost || itemData.unit_cost <= 0) throw new Error('Valid unit cost is required');
      // Add validation for selling_price
      if (typeof itemData.selling_price === 'undefined' || itemData.selling_price < 0) {
        throw new Error('Valid selling price is required');
      }

      const item = await InventoryItem.create(itemData, { transaction: t });
      
      // Update product stock
      const product = await Product.findByPk(itemData.product_id, { transaction: t });
      if (!product) throw new Error('Product not found');
      
      await product.update({
        quantity: sequelize.literal(`quantity + ${itemData.quantity}`)
      }, { transaction: t });

      // Create stock movement record
      await StockMovement.create({
        inventoryItem_id: item.id,
        movementType: 'added',
        quantity: itemData.quantity,
        source_inventory_id: itemData.inventory_id,
        direction: 'inbound',
        cost_per_unit: itemData.unit_cost,
        total_cost: itemData.unit_cost * itemData.quantity,
        performedBy: itemData.userId || null,
        status: 'completed'
      }, { transaction: t });

      await t.commit();
      return { success: true, message: 'Inventory item created successfully', item };
    } catch (error) {
      await t.rollback();
      console.error('Error creating inventory item:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error creating inventory item',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get all inventory items by inventory ID handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_ITEMS_BY_INVENTORY_ID, async (event, { inventoryId }) => {
    try {
      const items = await InventoryItem.findAll({
        where: { inventory_id: inventoryId },
        include: [
          { model: Product, as: 'product' },
          { model: Supplier, as: 'supplier' }
        ]
      });

      const totalItems = items.length;
      // Calculate total value using selling_price for consistency
      const totalValue = items.reduce((sum, item) => {
        const price = Number(item.selling_price) || 0;
        const qty = Number(item.quantity_left) || 0;
        return sum + (qty * price);
      }, 0);

      return {
        items: items.map(item => item.get({ plain: true })),
        totalItems,
        totalValue
      };
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      return { items: [], totalItems: 0, totalValue: 0 };
    }
  });

  // Get inventory item by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_ITEM, async (event, { id }) => {
    try {
      const item = await InventoryItem.findByPk(id);
      if (!item) {
        return { success: false, message: 'Inventory item not found' };
      }
      return { success: true, item };
    } catch (error) {
      return { success: false, message: 'Error retrieving inventory item', error };
    }
  });

  // Update inventory item handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_ITEM, async (event, { id, updates }) => {
    try {
      const item = await InventoryItem.findByPk(id);
    if (!item) {
      return { success: false, message: 'Inventory item not found' };
    }
    // Add validation for selling_price if it's being updated
    if (typeof updates.selling_price !== 'undefined' && updates.selling_price < 0) {
      throw new Error('Valid selling price is required');
    }
    await item.update(updates);
    return { success: true, message: 'Inventory item updated successfully', item };
  } catch (error) {
      return { success: false, message: 'Error updating inventory item', error };
    }
  });

  // Delete inventory item handler
  ipcMain.handle(IPC_CHANNELS.DELETE_ITEM, async (event, { id }) => {
    try {
      const item = await InventoryItem.findByPk(id);
      if (!item) {
        return { success: false, message: 'Inventory item not found' };
      }
      await item.destroy();
      return { success: true, message: 'Inventory item deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting inventory item', error };
    }
  });

  // Search products handler
  ipcMain.handle(IPC_CHANNELS.SEARCH_PRODUCTS, async (event, { query, warehouseId }) => {
    try {
      // First get the inventory to find its associated shop
      const inventory = await Inventory.findByPk(warehouseId);
      if (!inventory) {
        return {
          success: false,
          message: 'Inventory not found',
          products: []
        };
      }

      // Get products from the shop that match the query
      const products = await Product.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { name: { [Op.like]: `%${query}%` } },
                { sku: { [Op.like]: `%${query}%` } }
              ]
            },
            { shop_id: inventory.shopId }
          ]
        } as any,
        limit: 10
      });

      // Map products to a simpler format
      const productsWithSuppliers = await Promise.all(
        products.map(async (product) => {
          const plainProduct = product.get({ plain: true });
          
          // Find suppliers for this product through inventory items
          const inventoryItems = await InventoryItem.findAll({
            where: {
              product_id: product.id
            },
            include: [
              { 
                model: Supplier, 
                as: 'supplier',
                attributes: ['id', 'name', 'email', 'phone']
              }
            ]
          });
          
          // Extract unique suppliers
          const suppliers = [];
          const supplierIds = new Set();
          
          for (const item of inventoryItems) {
            const plainItem = item.get({ plain: true });
            // Type assertion to access supplier property safely
            const itemWithSupplier = plainItem as any;
            if (itemWithSupplier.supplier && !supplierIds.has(itemWithSupplier.supplier.id)) {
              supplierIds.add(itemWithSupplier.supplier.id);
              suppliers.push(itemWithSupplier.supplier);
            }
          }
          
          return {
            ...plainProduct,
            suppliers
          };
        })
      );

      return { 
        success: true, 
        products: productsWithSuppliers
      };
      
    } catch (error) {
      console.error('Search products error:', error);
      return { 
        success: false, 
        message: 'Error searching products',
        products: []
      };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
