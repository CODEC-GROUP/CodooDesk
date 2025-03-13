import { ipcMain } from 'electron';
import Sales, { SalesAttributes } from '../../../models/Sales.js';
import Payment from '../../../models/Payment.js';
import Receipt from '../../../models/Receipt.js';
import StockMovement from '../../../models/StockMovement.js';
import Inventory from '../../../models/Inventory.js';
import InventoryItem from '../../../models/InventoryItem.js';
import { createErrorResponse } from '../../../utils/errorHandling.js';
import { sequelize } from '../../database/index.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_SALE: 'sales:create',
  GET_SALE: 'sales:get',
  UPDATE_SALE: 'sales:update',
  DELETE_SALE: 'sales:delete',
  GET_ALL_SALES: 'sales:get-all'
};

// Register IPC handlers
export function registerSalesHandlers() {
  // Create sale handler should include payment processing
  ipcMain.handle(IPC_CHANNELS.CREATE_SALE, async (event, { salesData, paymentData }) => {
    const transaction = await sequelize.transaction();
    try {
      // Create sale
      const sale = await Sales.create(salesData, { transaction });
      
      // Process payment
      if (paymentData) {
        const payment = await Payment.create({
          ...paymentData,
          saleId: sale.id,
          status: 'completed',
          verifiedAt: new Date()
        }, { transaction });

        // Create receipt
        await Receipt.create({
          sale_id: sale.id,
          amount: salesData.netAmount,
          status: 'paid'
        }, { transaction });
      }

      // Update inventory
      for (const item of salesData.items) {
        // Find the inventory item for this product in this shop
        const inventoryItem = await InventoryItem.findOne({
          where: {
            product_id: item.productId,
          },
          transaction
        });

        if (inventoryItem) {
          await StockMovement.create({
            inventoryItem_id: inventoryItem.id,
            quantity: item.quantity,
            movementType: 'sold',
            source_inventory_id: salesData.shopId,
            performedBy: salesData.salesPersonId,
            direction: 'outbound',
            cost_per_unit: inventoryItem.unit_cost,
            total_cost: inventoryItem.unit_cost * item.quantity,
            status: 'completed'
          }, { transaction });

          // Update inventory item quantity
          await inventoryItem.decrement('quantity', {
            by: item.quantity,
            transaction
          });
        }
      }

      await transaction.commit();
      return { success: true, sale };
    } catch (error) {
      await transaction.rollback();
      return createErrorResponse(error);
    }
  });

  // Get sale by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_SALE, async (event, { id }) => {
    try {
      const sale = await Sales.findByPk(id, {
        include: ['employee', 'orders', 'invoice', 'receipt'],
      });
      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }
      return { success: true, sale };
    } catch (error) {
      return { success: false, message: 'Error retrieving sale', error };
    }
  });

  // Update sale handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_SALE, async (event, { id, updateData }) => {
    try {
      const sale = await Sales.findByPk(id);
      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }
      const updatedSale = await sale.update(updateData);
      return { success: true, message: 'Sale updated successfully', sale: updatedSale };
    } catch (error) {
      return { success: false, message: 'Error updating sale', error };
    }
  });

  // Delete sale handler
  ipcMain.handle(IPC_CHANNELS.DELETE_SALE, async (event, { id }) => {
    try {
      const sale = await Sales.findByPk(id);
      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }
      await sale.destroy();
      return { success: true, message: 'Sale deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting sale', error };
    }
  });

  // Get all sales handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_SALES, async () => {
    try {
      const sales = await Sales.findAll({
        include: ['employee', 'orders', 'invoice', 'receipt'],
      });
      return { success: true, sales };
    } catch (error) {
      return { success: false, message: 'Error retrieving sales', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
