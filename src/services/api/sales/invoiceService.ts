import { ipcMain } from 'electron';
import Invoice, { InvoiceAttributes } from '../../../models/Invoice.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_INVOICE: 'entities:invoice:create',
  GET_ALL_INVOICES: 'entities:invoice:get-all',
  GET_INVOICE: 'entities:invoice:get',
  UPDATE_INVOICE: 'entities:invoice:update',
  DELETE_INVOICE: 'entities:invoice:delete'
};

// Register IPC handlers
export function registerInvoiceHandlers() {
  // Create invoice handler
  ipcMain.handle(IPC_CHANNELS.CREATE_INVOICE, async (event, { invoiceData }) => {
    try {
      const invoice = await Invoice.create(invoiceData);
      return { success: true, message: 'Invoice created successfully', invoice };
    } catch (error) {
      return { success: false, message: 'Error creating invoice', error };
    }
  });

  // Get all invoices handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_INVOICES, async () => {
    try {
      const invoices = await Invoice.findAll({
        include: ['sale', 'payment'],
      });
      return { success: true, invoices };
    } catch (error) {
      return { success: false, message: 'Error fetching invoices', error };
    }
  });

  // Get invoice by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_INVOICE, async (event, { id }) => {
    try {
      const invoice = await Invoice.findByPk(id, {
        include: ['sale', 'payment'],
      });
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }
      return { success: true, invoice };
    } catch (error) {
      return { success: false, message: 'Error retrieving invoice', error };
    }
  });

  // Update invoice handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_INVOICE, async (event, { id, updates }) => {
    try {
      const invoice = await Invoice.findByPk(id);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }
      await invoice.update(updates);
      return { success: true, message: 'Invoice updated successfully', invoice };
    } catch (error) {
      return { success: false, message: 'Error updating invoice', error };
    }
  });

  // Delete invoice handler
  ipcMain.handle(IPC_CHANNELS.DELETE_INVOICE, async (event, { id }) => {
    try {
      const invoice = await Invoice.findByPk(id);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }
      await invoice.destroy();
      return { success: true, message: 'Invoice deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting invoice', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
