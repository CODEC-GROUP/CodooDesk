import { ipcMain } from 'electron';
import Inventory, { InventoryAttributes } from '../../../models/Inventory.js';
import Shop from '../../../models/Shop.js';
import InventoryItem from '../../../models/InventoryItem.js';
import { z } from 'zod';
import { Op } from 'sequelize';

// Add interface for inventory items needed for warehouse value calculation
interface InventoryItemType {
  quantity: number;
  selling_price: number;
}

interface InventoryWithItems extends InventoryAttributes {
  inventoryItems?: InventoryItemType[];
}

// Input validation schemas
const inventorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  level: z.number().min(0),
  value: z.number().min(0),
  shopId: z.string().nullable(),
  status: z.enum(['Low', 'Medium', 'High']).optional()
});

const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  quantity: z.number().min(0),
  price: z.number().min(0),
  sku: z.string().optional(),
  inventoryId: z.string(),
  category: z.string().optional(),
  unit: z.string().optional(),
  minimumStock: z.number().min(0).optional(),
  location: z.string().optional()
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10)
});

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_INVENTORY: 'inventory:create',
  GET_INVENTORY: 'inventory:get',
  UPDATE_INVENTORY: 'inventory:update',
  DELETE_INVENTORY: 'inventory:delete',
  GET_INVENTORIES_BY_SHOP: 'inventory:get-by-shop',
  BULK_CREATE_INVENTORY: 'inventory:bulk-create',
  BULK_UPDATE_INVENTORY: 'inventory:bulk-update',
  // CREATE_INVENTORY_ITEM: 'inventory:item:create',
  // GET_INVENTORY_ITEMS: 'inventory:item:list',
  // UPDATE_INVENTORY_ITEM: 'inventory:item:update',
  // DELETE_INVENTORY_ITEM: 'inventory:item:delete',
  // BULK_CREATE_INVENTORY_ITEMS: 'inventory:item:bulk-create',
  // BULK_UPDATE_INVENTORY_ITEMS: 'inventory:item:bulk-update'
};

interface ApiError extends Error {
  code?: string;
  details?: unknown;
}

// Register IPC handlers
export function registerInventoryHandlers() {
  // Create inventory handler
  ipcMain.handle(IPC_CHANNELS.CREATE_INVENTORY, async (event, inventoryData) => {
    try {
      const validatedData = inventorySchema.parse(inventoryData);
      const inventory = await Inventory.create({
        ...validatedData,
        shopId: validatedData.shopId || undefined
      });
      return { success: true, data: inventory };
    } catch (error) {
      const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
      return { 
        success: false, 
        message: 'Error creating inventory', 
        error: {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details
        }
      };
    }
  });

  // Get inventory by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_INVENTORY, async (event, { id }) => {
    try {
      const inventory = await Inventory.findByPk(id);
      if (!inventory) {
        return { success: false, message: 'Inventory not found', code: 'NOT_FOUND' };
      }
      return { success: true, inventory };
    } catch (error) {
      const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
      return { 
        success: false, 
        message: 'Error retrieving inventory',
        error: {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details
        }
      };
    }
  });

  // Update inventory handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_INVENTORY, async (event, { id, updates }) => {
    try {
      const validatedUpdates = inventorySchema.partial().parse(updates);
      const inventory = await Inventory.findByPk(id);
      if (!inventory) {
        return { success: false, message: 'Inventory not found', code: 'NOT_FOUND' };
      }
      await inventory.update({
        ...validatedUpdates,
        shopId: validatedUpdates.shopId ?? undefined
      });
      return { success: true, message: 'Inventory updated successfully', inventory };
    } catch (error) {
      const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
      return { 
        success: false, 
        message: 'Error updating inventory',
        error: {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details
        }
      };
    }
  });

  // Delete inventory handler
  ipcMain.handle(IPC_CHANNELS.DELETE_INVENTORY, async (event, { id }) => {
    try {
      const inventory = await Inventory.findByPk(id);
      if (!inventory) {
        return { success: false, message: 'Inventory not found', code: 'NOT_FOUND' };
      }
      await inventory.destroy();
      return { success: true, message: 'Inventory deleted successfully' };
    } catch (error) {
      const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
      return { 
        success: false, 
        message: 'Error deleting inventory',
        error: {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details
        }
      };
    }
  });

  // Get inventories by shop handler with pagination
  ipcMain.handle(IPC_CHANNELS.GET_INVENTORIES_BY_SHOP, async (event, { shopId, shopIds, isAdmin, pagination }) => {
    try {
      const { page, limit } = paginationSchema.parse(pagination || {});
      
      // Build where clause based on shop access
      let whereClause = {};
      if (shopId) {
        whereClause = { shopId };
      } else if (shopIds && shopIds.length > 0) {
        whereClause = {
          shopId: {
            [Op.in]: shopIds
          }
        };
      } else if (!isAdmin) {
        throw new Error('No shop access configured');
      }
      
      const { count, rows: inventories } = await Inventory.findAndCountAll({
        where: whereClause,
        include: [
          { model: Shop, as: 'shop' },
          {
            model: InventoryItem,
            as: 'inventoryItems',
            // Only fetch attributes needed for this calculation
            attributes: ['quantity', 'selling_price']
          }
        ],
        limit,
        offset: (page - 1) * limit,
        order: [['createdAt', 'DESC']]
      });
      
      return { 
        success: true, 
        data: {
          items: (inventories as unknown as InventoryWithItems[]).map(inv => {
            // Calculate level as the count of distinct inventory items
            const totalLevel = inv.inventoryItems?.length || 0;
            
            // Calculate total value using selling_price for potential revenue valuation
            const totalValue = inv.inventoryItems?.reduce((sum: number, item: InventoryItemType) => {
              // Ensure values are treated as numbers
              const price = Number(item.selling_price) || 0;
              const qty = Number(item.quantity) || 0;
              return sum + (qty * price);
            }, 0) || 0;
            
            // Determine status based on total level
            let status = inv.status;
            if (totalLevel === 0) {
              status = 'Low';
            } else if (totalLevel < 10) {
              status = 'Low';
            } else if (totalLevel < 50) {
              status = 'Medium';
            } else {
              status = 'High';
            }
            
            return {
              id: inv.id,
              name: inv.name,
              level: totalLevel,
              value: totalValue,
              status: status,
              shopId: inv.shopId,
              description: inv.description
            };
          }),
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
      return { 
        success: false, 
        message: 'Error fetching inventories',
        error: {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details
        }
      };
    }
  });

  // Bulk create inventories handler
  ipcMain.handle(IPC_CHANNELS.BULK_CREATE_INVENTORY, async (event, inventories) => {
    try {
      const validatedData = z.array(inventorySchema).parse(inventories);
      const createdInventories = await Inventory.bulkCreate(validatedData.map(data => ({
        ...data,
        shopId: data.shopId || undefined
      })));
      return { success: true, data: createdInventories };
    } catch (error) {
      const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
      return { 
        success: false, 
        message: 'Error bulk creating inventories',
        error: {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details
        }
      };
    }
  });

  // Bulk update inventories handler
  ipcMain.handle(IPC_CHANNELS.BULK_UPDATE_INVENTORY, async (event, updates) => {
    try {
      const validatedUpdates = z.array(z.object({
        id: z.string(),
        data: inventorySchema.partial()
      })).parse(updates);
      
      const results = await Promise.all(validatedUpdates.map(async ({ id, data }) => {
        const inventory = await Inventory.findByPk(id);
        if (!inventory) return { id, success: false, message: 'Inventory not found' };
        await inventory.update({
          ...data,
          shopId: data.shopId ?? undefined
        });
        return { id, success: true, inventory };
      }));

      return { success: true, data: results };
    } catch (error) {
      const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
      return { 
        success: false, 
        message: 'Error bulk updating inventories',
        error: {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details
        }
      };
    }
  });

  // Create inventory item handler
  // ipcMain.handle(IPC_CHANNELS.CREATE_INVENTORY_ITEM, async (event, itemData) => {
  //   try {
  //     const validatedData = inventoryItemSchema.parse(itemData);
      
  //     // Check if inventory exists
  //     const inventory = await Inventory.findByPk(validatedData.inventoryId);
  //     if (!inventory) {
  //       return { 
  //         success: false, 
  //         message: 'Inventory not found', 
  //         code: 'INVENTORY_NOT_FOUND' 
  //       };
  //     }

  //     const item = await InventoryItem.create(validatedData);
      
  //     // Update inventory level and value
  //     await inventory.update({
  //       level: inventory.level + validatedData.quantity,
  //       value: inventory.value + (validatedData.quantity * validatedData.price)
  //     });

  //     return { success: true, data: item };
  //   } catch (error) {
  //     const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
  //     return { 
  //       success: false, 
  //       message: 'Error creating inventory item', 
  //       error: {
  //         message: apiError.message,
  //         code: apiError.code,
  //         details: apiError.details
  //       }
  //     };
  //   }
  // });

  // // Get inventory items handler
  // ipcMain.handle(IPC_CHANNELS.GET_INVENTORY_ITEMS, async (event, { inventoryId, pagination, filters }) => {
  //   try {
  //     const { page, limit } = paginationSchema.parse(pagination || {});
      
  //     const whereClause = {
  //       inventoryId,
  //       ...(filters?.category && { category: filters.category }),
  //       ...(filters?.search && { 
  //         [Op.or]: [
  //           { name: { [Op.like]: `%${filters.search}%` } },
  //           { sku: { [Op.like]: `%${filters.search}%` } }
  //         ]
  //       })
  //     };

  //     const { count, rows: items } = await InventoryItem.findAndCountAll({
  //       where: whereClause,
  //       limit,
  //       offset: (page - 1) * limit,
  //       order: [['createdAt', 'DESC']]
  //     });

  //     return { 
  //       success: true, 
  //       data: {
  //         items,
  //         pagination: {
  //           page,
  //           limit,
  //           total: count,
  //           totalPages: Math.ceil(count / limit)
  //         }
  //       }
  //     };
  //   } catch (error) {
  //     const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
  //     return { 
  //       success: false, 
  //       message: 'Error fetching inventory items',
  //       error: {
  //         message: apiError.message,
  //         code: apiError.code,
  //         details: apiError.details
  //       }
  //     };
  //   }
  // });

  // // Update inventory item handler
  // ipcMain.handle(IPC_CHANNELS.UPDATE_INVENTORY_ITEM, async (event, { id, updates }) => {
  //   try {
  //     const validatedUpdates = inventoryItemSchema.partial().parse(updates);
      
  //     const item = await InventoryItem.findByPk(id);
  //     if (!item) {
  //       return { 
  //         success: false, 
  //         message: 'Inventory item not found',
  //         code: 'ITEM_NOT_FOUND'
  //       };
  //     }

  //     const inventory = await Inventory.findByPk(item.inventoryId);
  //     if (!inventory) {
  //       return { 
  //         success: false, 
  //         message: 'Inventory not found',
  //         code: 'INVENTORY_NOT_FOUND'
  //       };
  //     }

  //     // If quantity is being updated, update inventory level and value
  //     if (typeof validatedUpdates.quantity !== 'undefined') {
  //       const quantityDiff = validatedUpdates.quantity - item.quantity;
  //       const newPrice = validatedUpdates.price || item.price;
        
  //       await inventory.update({
  //         level: inventory.level + quantityDiff,
  //         value: inventory.value + (quantityDiff * newPrice)
  //       });
  //     }

  //     await item.update(validatedUpdates);
  //     return { success: true, data: item };
  //   } catch (error) {
  //     const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
  //     return { 
  //       success: false, 
  //       message: 'Error updating inventory item',
  //       error: {
  //         message: apiError.message,
  //         code: apiError.code,
  //         details: apiError.details
  //       }
  //     };
  //   }
  // });

  // // Delete inventory item handler
  // ipcMain.handle(IPC_CHANNELS.DELETE_INVENTORY_ITEM, async (event, { id }) => {
  //   try {
  //     const item = await InventoryItem.findByPk(id);
  //     if (!item) {
  //       return { 
  //         success: false, 
  //         message: 'Inventory item not found',
  //         code: 'ITEM_NOT_FOUND'
  //       };
  //     }

  //     const inventory = await Inventory.findByPk(item.inventoryId);
  //     if (!inventory) {
  //       return { 
  //         success: false, 
  //         message: 'Inventory not found',
  //         code: 'INVENTORY_NOT_FOUND'
  //       };
  //     }

  //     // Update inventory level and value before deleting item
  //     await inventory.update({
  //       level: inventory.level - item.quantity,
  //       value: inventory.value - (item.quantity * item.price)
  //     });

  //     await item.destroy();
  //     return { success: true, message: 'Inventory item deleted successfully' };
  //   } catch (error) {
  //     const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
  //     return { 
  //       success: false, 
  //       message: 'Error deleting inventory item',
  //       error: {
  //         message: apiError.message,
  //         code: apiError.code,
  //         details: apiError.details
  //       }
  //     };
  //   }
  // });

  // // Bulk create inventory items handler
  // ipcMain.handle(IPC_CHANNELS.BULK_CREATE_INVENTORY_ITEMS, async (event, { items, inventoryId }) => {
  //   try {
  //     const validatedItems = z.array(inventoryItemSchema).parse(
  //       items.map(item => ({ ...item, inventoryId }))
  //     );

  //     const inventory = await Inventory.findByPk(inventoryId);
  //     if (!inventory) {
  //       return { 
  //         success: false, 
  //         message: 'Inventory not found',
  //         code: 'INVENTORY_NOT_FOUND'
  //       };
  //     }

  //     const createdItems = await InventoryItem.bulkCreate(validatedItems);

  //     // Update inventory level and value
  //     const totalQuantity = validatedItems.reduce((sum, item) => sum + item.quantity, 0);
  //     const totalValue = validatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  //     await inventory.update({
  //       level: inventory.level + totalQuantity,
  //       value: inventory.value + totalValue
  //     });

  //     return { success: true, data: createdItems };
  //   } catch (error) {
  //     const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
  //     return { 
  //       success: false, 
  //       message: 'Error bulk creating inventory items',
  //       error: {
  //         message: apiError.message,
  //         code: apiError.code,
  //         details: apiError.details
  //       }
  //     };
  //   }
  // });

  // // Bulk update inventory items handler
  // ipcMain.handle(IPC_CHANNELS.BULK_UPDATE_INVENTORY_ITEMS, async (event, updates) => {
  //   try {
  //     const validatedUpdates = z.array(z.object({
  //       id: z.string(),
  //       data: inventoryItemSchema.partial()
  //     })).parse(updates);

  //     const results = await Promise.all(validatedUpdates.map(async ({ id, data }) => {
  //       const item = await InventoryItem.findByPk(id);
  //       if (!item) return { id, success: false, message: 'Item not found' };

  //       const inventory = await Inventory.findByPk(item.inventoryId);
  //       if (!inventory) return { id, success: false, message: 'Inventory not found' };

  //       // If quantity is being updated, update inventory level and value
  //       if (typeof data.quantity !== 'undefined') {
  //         const quantityDiff = data.quantity - item.quantity;
  //         const newPrice = data.price || item.price;
          
  //         await inventory.update({
  //           level: inventory.level + quantityDiff,
  //           value: inventory.value + (quantityDiff * newPrice)
  //         });
  //       }

  //       await item.update(data);
  //       return { id, success: true, item };
  //     }));

  //     return { success: true, data: results };
  //   } catch (error) {
  //     const apiError: ApiError = error instanceof Error ? error : new Error('Unknown error');
  //     return { 
  //       success: false, 
  //       message: 'Error bulk updating inventory items',
  //       error: {
  //         message: apiError.message,
  //         code: apiError.code,
  //         details: apiError.details
  //       }
  //     };
  //   }
  // });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
