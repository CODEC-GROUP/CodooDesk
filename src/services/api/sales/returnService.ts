import { ipcMain } from 'electron';
import { sequelize } from '../../database/index.js';
import { Op } from 'sequelize';
import Return, { ReturnAttributes } from '../../../models/Return.js';
import Product from '../../../models/Product.js';
import Sales from '../../../models/Sales.js';
import Order from '../../../models/Order.js';
import Customer from '../../../models/Customer.js';

const IPC_CHANNELS = {
  CREATE_RETURN: 'entities:return:create',
  GET_ALL_RETURNS: 'entities:return:get-all',
  GET_RETURN: 'entities:return:get',
  UPDATE_RETURN: 'entities:return:update',
  DELETE_RETURN: 'entities:return:delete',
  SEARCH_SALE: 'entities:return:search-sale',
  GET_SALE_SUGGESTIONS: 'entities:return:get-suggestions',
  SEARCH_RETURN: 'entities:return:search-return',
  APPROVE_RETURN: 'entities:return:approve',
  REJECT_RETURN: 'entities:return:reject'
};

export function registerReturnHandlers() {
  // Get sale suggestions as user types
  ipcMain.handle(IPC_CHANNELS.GET_SALE_SUGGESTIONS, async (event, { searchTerm, shopIds }) => {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return { success: true, suggestions: [] };
      }

      const searchWords = searchTerm.toLowerCase().split(' ');
      
      // Search for sales with matching customer name or reference numbers
      const sales = await Sales.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { id: { [Op.like]: `%${searchTerm}%` } },
                { receipt_id: { [Op.like]: `%${searchTerm}%` } },
                { invoice_id: { [Op.like]: `%${searchTerm}%` } },
                {
                  [Op.and]: searchWords.map((word: string) => ({
                    '$customer.first_name$': { [Op.like]: `%${word}%` }
                  }))
                },
                {
                  [Op.and]: searchWords.map((word: string) => ({
                    '$customer.last_name$': { [Op.like]: `%${word}%` }
                  }))
                }
              ]
            },
            { shopId: { [Op.in]: shopIds } }
          ]
        },
        include: [
          {
            model: Customer,
            as: 'customer',
            required: false,
            attributes: ['first_name', 'last_name']
          }
        ],
        limit: 10
      });

      const suggestions = sales.map(sale => ({
        id: sale.id,
        receipt_id: sale.receipt_id || '',
        invoice_id: sale.invoice_id || '',
        customer_name: sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}` : 'Walking Customer',
        total_amount: sale.netAmount,
        created_at: sale.createdAt,
        display: `${sale.receipt_id || sale.invoice_id || sale.id} - ${sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}` : 'Walking Customer'}`
      }));

      return { success: true, suggestions };
    } catch (error) {
      console.error('Error getting sale suggestions:', error);
      return { success: false, message: 'Failed to get sale suggestions' };
    }
  });

  // Create a new return
  ipcMain.handle(IPC_CHANNELS.CREATE_RETURN, async (event, { returnData }) => {
    const t = await sequelize.transaction();
  
    try {
      const { saleId, items, total, customer, paymentMethod, shopId } = returnData;
      let createdReturn = null;
      
      // Create individual returns for each item
      for (const item of items) {
        // Validate that orderId exists and is valid
        if (!item.orderId) {
          throw new Error('Order ID is required for return processing');
        }
        
        const order = await Order.findOne({
          where: { id: item.orderId },
          transaction: t
        });

        if (!order) {
          throw new Error(`Order with ID ${item.orderId} not found`);
        }
        
        let productShopId = null;
        
        // Only try to update product if productId is provided and not empty
        if (item.productId && item.productId.trim() !== '') {
          try {
            const product = await Product.findByPk(item.productId);
            if (product) {
              productShopId = product.shop_id;
              
              // Update product stock quantity
              await product.update({
                quantity: product.quantity + item.quantity
              }, { transaction: t });
              
              // Keep the productId since it's valid
            } else {
              // Product not found, set productId to null
              item.productId = null;
              console.warn(`Product with ID ${item.productId} not found, setting productId to null`);
            }
          } catch (error) {
            // Error finding product, set productId to null
            item.productId = null;
            console.warn(`Error finding product with ID ${item.productId}, setting productId to null:`, error);
          }
        } else {
          // No productId or empty productId, explicitly set to null
          item.productId = null;
          console.log('No valid productId provided for this return item, setting productId to null');
        }
        
        // Use the shop ID from the product if found, otherwise use the one from returnData
        const effectiveShopId = productShopId || returnData.shopId;
        
        if (!effectiveShopId) {
          throw new Error('Shop ID not found for the product');
        }

        // Create the return record
        createdReturn = await Return.create({
          orderId: item.orderId,
          productId: item.productId, // This will be null if not valid
          productName: item.productName, // Store the product name explicitly
          customerFirstName: customer.name,
          customerLastName: '',
          quantity: item.quantity,
          amount: item.price * item.quantity,
          reason: item.reason,
          description: item.description,
          paymentMethod: paymentMethod,
          status: 'pending',
          date: new Date(),
          shopId: effectiveShopId,
          saleId: saleId
        }, { transaction: t });

        // Update the corresponding order's quantity and payment status
        const updatedQuantity = order.quantity - item.quantity;
        if (updatedQuantity < 0) {
          throw new Error(`Cannot return more items (${item.quantity}) than were ordered (${order.quantity})`);
        }
        
        await order.update({
          quantity: updatedQuantity,
          paymentStatus: updatedQuantity === 0 ? 'refunded' : 'paid'
        }, { transaction: t });
      }

      // Update the sale's net amount
      const sale = await Sales.findByPk(saleId, { transaction: t });
      if (sale) {
        const newNetAmount = sale.netAmount - total;
        await sale.update({
          netAmount: newNetAmount,
          status: newNetAmount === 0 ? 'cancelled' : 'completed'
        }, { transaction: t });
      }

      await t.commit();

      // Format the return data to match the frontend's expected structure
      const formattedReturn = createdReturn ? {
        id: createdReturn.id,
        shopId: createdReturn.shopId,
        orderId: createdReturn.orderId,
        items: [{
          id: createdReturn.id,
          productId: createdReturn.productId,
          productName: createdReturn.productName,
          quantity: createdReturn.quantity,
          price: createdReturn.amount / createdReturn.quantity,
          reason: createdReturn.reason,
          description: createdReturn.description
        }],
        total: createdReturn.amount,
        status: createdReturn.status,
        createdAt: createdReturn.date.toISOString(),
        customer: {
          id: customer.id,
          name: customer.name
        },
        paymentMethod: createdReturn.paymentMethod
      } : null;

      return { 
        success: true, 
        message: 'Returns processed successfully',
        return: formattedReturn
      };
    } catch (error) {
      await t.rollback();
      console.error('Error creating return:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create return' 
      };
    }
  });

  // Search sale and get details
  ipcMain.handle(IPC_CHANNELS.SEARCH_SALE, async (event, { searchTerm }) => {
    try {
      const sale = await Sales.findByPk(searchTerm, {
        include: [
          {
            model: Order,
            attributes: ['id', 'product_id', 'productName', 'quantity', 'sellingPrice', 'paymentStatus'],
            include: [
              {
                model: Product,
                attributes: ['id', 'name', 'quantity', 'sellingPrice']
              }
            ]
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['first_name', 'last_name', 'phone_number']
          }
        ]
      });

      if (!sale) {
        return { success: false, message: 'Sale not found' };
      }

      return { success: true, sale };
    } catch (error: Error | unknown) {
      console.error('Error searching sale:', error);
      if (error instanceof Error) {
        return { success: false, message: error.message };
      } else {
        return { success: false, message: 'Failed to search sale' };
      }
    }
  });

  // Get all returns handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_RETURNS, async (event, { shopIds }) => {
    try {
      const returns = await Return.findAll({
        where: {
          shopId: {
            [Op.in]: shopIds
          }
        },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name']
          },
          {
            model: Sales,
            as: 'sale',
            attributes: ['id', 'receipt_id', 'invoice_id']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Format returns for frontend
      const formattedReturns = returns.map(returnItem => {
        const plainReturn = returnItem.get({ plain: true });
        return {
          id: plainReturn.id,
          shopId: plainReturn.shopId,
          orderId: plainReturn.orderId,
          saleId: plainReturn.saleId,
          items: [{
            id: plainReturn.id,
            productId: plainReturn.productId,
            productName: plainReturn.productName || (plainReturn.product ? plainReturn.product.name : 'Unknown Product'),
            quantity: plainReturn.quantity,
            price: plainReturn.amount / plainReturn.quantity,
            reason: plainReturn.reason,
            description: plainReturn.description
          }],
          total: plainReturn.amount,
          status: plainReturn.status,
          createdAt: plainReturn.date.toISOString(),
          customer: {
            id: '', // No customer ID in the return model
            name: `${plainReturn.customerFirstName} ${plainReturn.customerLastName}`.trim()
          },
          paymentMethod: plainReturn.paymentMethod
        };
      });

      return { success: true, returns: formattedReturns };
    } catch (error) {
      console.error('Error getting returns:', error);
      return { success: false, message: 'Failed to get returns' };
    }
  });

  // Get return by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_RETURN, async (event, { id }) => {
    try {
      const returnItem = await Return.findByPk(id, {
        include: ['sale', 'product'],
      });
      if (!returnItem) {
        return { success: false, message: 'Return not found' };
      }

      const plainReturn = returnItem.get({ plain: true });
      
      // Format return for frontend
      const formattedReturn = {
        id: plainReturn.id,
        shopId: plainReturn.shopId,
        orderId: plainReturn.orderId,
        items: [{
          id: plainReturn.id,
          productId: plainReturn.productId,
          productName: plainReturn.productName || (plainReturn.product ? plainReturn.product.name : 'Unknown Product'),
          quantity: plainReturn.quantity,
          price: plainReturn.amount / plainReturn.quantity,
          reason: plainReturn.reason,
          description: plainReturn.description
        }],
        total: plainReturn.amount,
        status: plainReturn.status,
        createdAt: plainReturn.date.toISOString(),
        customer: {
          id: '', // No customer ID in the return model
          name: `${plainReturn.customerFirstName} ${plainReturn.customerLastName}`.trim()
        },
        paymentMethod: plainReturn.paymentMethod
      };

      return { success: true, return: formattedReturn };
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      } else {
        return { success: false, message: 'Error retrieving return' };
      }
    }
  });

  // Update return handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_RETURN, async (event, { id, updates }) => {
    try {
      const returnItem = await Return.findByPk(id);
      if (!returnItem) {
        return { success: false, message: 'Return not found' };
      }

      // Extract the first item from the updates.items array if it exists
      const itemUpdates = updates.items && updates.items.length > 0 ? updates.items[0] : null;
      
      // Prepare the update object
      const updateData: any = {};
      
      // Update basic fields if provided
      if (updates.status) updateData.status = updates.status;
      if (updates.paymentMethod) updateData.paymentMethod = updates.paymentMethod;
      
      // Update item-specific fields if provided
      if (itemUpdates) {
        if (itemUpdates.reason) updateData.reason = itemUpdates.reason;
        if (itemUpdates.description) updateData.description = itemUpdates.description;
        if (itemUpdates.productName) updateData.productName = itemUpdates.productName;
        
        // Only update quantity and amount if quantity is provided
        if (itemUpdates.quantity) {
          updateData.quantity = itemUpdates.quantity;
          // Recalculate amount based on new quantity and price
          if (itemUpdates.price) {
            updateData.amount = itemUpdates.quantity * itemUpdates.price;
          } else {
            // Use existing price to calculate new amount
            updateData.amount = itemUpdates.quantity * (returnItem.amount / returnItem.quantity);
          }
        }
      }
      
      // Perform the update
      await returnItem.update(updateData);
      
      // Fetch the updated return with associations
      const updatedReturn = await Return.findByPk(id, {
        include: ['product']
      });
      
      if (!updatedReturn) {
        return { success: false, message: 'Failed to retrieve updated return' };
      }
      
      const plainReturn = updatedReturn.get({ plain: true });
      
      // Format the return for frontend
      const formattedReturn = {
        id: plainReturn.id,
        shopId: plainReturn.shopId,
        orderId: plainReturn.orderId,
        items: [{
          id: plainReturn.id,
          productId: plainReturn.productId,
          productName: plainReturn.productName || (plainReturn.product ? plainReturn.product.name : 'Unknown Product'),
          quantity: plainReturn.quantity,
          price: plainReturn.amount / plainReturn.quantity,
          reason: plainReturn.reason,
          description: plainReturn.description
        }],
        total: plainReturn.amount,
        status: plainReturn.status,
        createdAt: plainReturn.date.toISOString(),
        customer: {
          id: '', // No customer ID in the return model
          name: `${plainReturn.customerFirstName} ${plainReturn.customerLastName}`.trim()
        },
        paymentMethod: plainReturn.paymentMethod
      };

      return { success: true, return: formattedReturn };
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      } else {
        return { success: false, message: 'An unknown error occurred' };
      }
    }
  });

  // Delete return handler
  ipcMain.handle(IPC_CHANNELS.DELETE_RETURN, async (event, { id }) => {
    const t = await sequelize.transaction();
    
    try {
      // First find the return with all necessary relations
      const returnInstance = await Return.findByPk(id, { 
        transaction: t,
        include: [{
          model: Order,
          as: 'order',
          required: false
        }]
      });

      if (!returnInstance) {
        await t.rollback();
        return { 
          success: false, 
          message: 'Return not found',
          details: 'The specified return ID does not exist in the database'
        };
      }

      // Get the associated order
      const order = await Order.findByPk(returnInstance.orderId, { transaction: t });
      
      if (order) {
        // Restore the order quantity
        await order.update({
          quantity: order.quantity + returnInstance.quantity,
          paymentStatus: 'paid' // Reset payment status since we're restoring the order
        }, { transaction: t });

        // Update the sale's net amount
        const sale = await Sales.findByPk(order.saleId, { transaction: t });
        if (sale) {
          const newNetAmount = sale.netAmount + (returnInstance.quantity * returnInstance.amount / returnInstance.quantity);
          await sale.update({
            netAmount: newNetAmount,
            status: newNetAmount > 0 ? 'completed' : 'cancelled'
          }, { transaction: t });
        }
      }

      // Delete the return
      await returnInstance.destroy({ transaction: t });
      
      // Commit the transaction
      await t.commit();
      
      return { 
        success: true, 
        message: 'Return deleted successfully',
        deletedReturnId: id
      };
    } catch (error) {
      // Rollback the transaction on error
      await t.rollback();
      console.error('Error deleting return:', error);
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error deleting return',
        details: error instanceof Error ? error.stack : 'Unknown error occurred'
      };
    }
  });

  // Add approve return handler
  ipcMain.handle(IPC_CHANNELS.APPROVE_RETURN, async (event, { returnId }) => {
    try {
      const returnInstance = await Return.findByPk(returnId);
      if (!returnInstance) {
        return { success: false, message: 'Return not found' };
      }

      await returnInstance.update({ status: 'completed' });

      // Update product stock and order status as needed
      // Add your business logic here

      return { 
        success: true, 
        message: 'Return approved successfully',
        return: returnInstance
      };
    } catch (error) {
      console.error('Error approving return:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to approve return'
      };
    }
  });

  // Add reject return handler
  ipcMain.handle(IPC_CHANNELS.REJECT_RETURN, async (event, { returnId }) => {
    try {
      const returnInstance = await Return.findByPk(returnId);
      if (!returnInstance) {
        return { success: false, message: 'Return not found' };
      }

      await returnInstance.update({ status: 'pending' });

      return { 
        success: true, 
        message: 'Return rejected successfully',
        return: returnInstance
      };
    } catch (error) {
      console.error('Error rejecting return:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to reject return'
      };
    }
  });
}

export { IPC_CHANNELS };
