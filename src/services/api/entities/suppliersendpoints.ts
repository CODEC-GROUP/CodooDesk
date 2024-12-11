import { ipcMain } from 'electron';
import Supplier, { SupplierAttributes } from '../../../models/Supplier.js';
import Product from '../../../models/Product.js';
import { Sequelize } from 'sequelize';
import Order from '../../../models/Order.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_SUPPLIER: 'entities:supplier:create',
  GET_ALL_SUPPLIERS: 'entities:supplier:get-all',
  GET_SUPPLIER: 'entities:supplier:get',
  UPDATE_SUPPLIER: 'entities:supplier:update',
  DELETE_SUPPLIER: 'entities:supplier:delete'
};

// Register IPC handlers
export function registerSupplierHandlers() {
  // Create supplier handler
  ipcMain.handle(IPC_CHANNELS.CREATE_SUPPLIER, async (event, { supplierData }) => {
    try {
      if (!supplierData) {
        throw new Error('Supplier data is required');
      }

      const supplier = await Supplier.create({
        name: supplierData.name,
        email: supplierData.email,
        phone: supplierData.phone,
        address: supplierData.address,
        city: supplierData.city,
        region: supplierData.region,
        country: supplierData.country,
        businessId: supplierData.businessId,
      });

      return { success: true, supplier };
    } catch (error) {
      console.error('Error creating supplier:', error);
      return { success: false, message: 'Failed to create supplier' };
    }
  });

  // Get all suppliers handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_SUPPLIERS, async (event, { businessId }) => {
    try {
      const suppliers = await Supplier.findAll({
        where: { businessId },
        include: [
          {
            model: Product,
            as: 'supplierProducts',
            attributes: [
              'id',
              'name',
              [Sequelize.fn('COUNT', Sequelize.col('supplierProducts.id')), 'productCount'],
              [Sequelize.fn('SUM', Sequelize.col('supplierProducts.purchasePrice')), 'totalValue']
            ],
            include: [{
              model: Order,
              as: 'orders',
              attributes: []
            }],
            through: { attributes: [] }
          }
        ],
        group: ['Supplier.id', 'supplierProducts.id'],
      });
      
      // Convert Sequelize models to plain objects
      const plainSuppliers = suppliers.map(supplier => {
        const plainSupplier = supplier.get({ plain: true });
        // Ensure supplierProducts is always an array
        plainSupplier.supplierProducts = plainSupplier.supplierProducts || [];
        return plainSupplier;
      });

      return { success: true, suppliers: plainSuppliers };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message: 'Error fetching suppliers', error: errorMessage };
    }
  });

  // Get supplier by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_SUPPLIER, async (event, { id }) => {
    try {
      const supplier = await Supplier.findByPk(id, {
        include: ['location', 'inventoryItems'],
      });
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }
      return { success: true, supplier };
    } catch (error) {
      return { success: false, message: 'Error retrieving supplier', error };
    }
  });

  // Update supplier handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_SUPPLIER, async (event, { id, updates }) => {
    try {
      const supplier = await Supplier.findByPk(id);
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }

      await supplier.update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        address: updates.address,
        city: updates.city,
        region: updates.region,
        country: updates.country,
        businessId: updates.businessId
      });

      return { success: true, supplier };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return { success: false, message: 'Failed to update supplier' };
    }
  });

  // Delete supplier handler
  ipcMain.handle(IPC_CHANNELS.DELETE_SUPPLIER, async (event, { id }) => {
    try {
      const supplier = await Supplier.findByPk(id);
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }
      await supplier.destroy();
      return { success: true, message: 'Supplier deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting supplier', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };