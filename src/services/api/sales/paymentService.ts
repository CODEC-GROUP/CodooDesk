import { ipcMain } from 'electron';
import Payment, { PaymentAttributes } from '../../../models/Payment.js';

// IPC Channel names
const IPC_CHANNELS = {
  CREATE_PAYMENT: 'entities:payment:create',
  GET_ALL_PAYMENTS: 'entities:payment:get-all',
  GET_PAYMENT: 'entities:payment:get',
  UPDATE_PAYMENT: 'entities:payment:update',
  DELETE_PAYMENT: 'entities:payment:delete'
};

// Register IPC handlers
export function registerPaymentHandlers() {
  // Create payment handler
  ipcMain.handle(IPC_CHANNELS.CREATE_PAYMENT, async (event, { paymentData }) => {
    try {
      const payment = await Payment.create(paymentData);
      return { success: true, message: 'Payment created successfully', payment };
    } catch (error) {
      return { success: false, message: 'Error creating payment', error };
    }
  });

  // Get all payments handler
  ipcMain.handle(IPC_CHANNELS.GET_ALL_PAYMENTS, async () => {
    try {
      const payments = await Payment.findAll({
        include: ['invoice', 'receipt'],
      });
      return { success: true, payments };
    } catch (error) {
      return { success: false, message: 'Error fetching payments', error };
    }
  });

  // Get payment by ID handler
  ipcMain.handle(IPC_CHANNELS.GET_PAYMENT, async (event, { id }) => {
    try {
      const payment = await Payment.findByPk(id, {
        include: ['invoice', 'receipt'],
      });
      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }
      return { success: true, payment };
    } catch (error) {
      return { success: false, message: 'Error retrieving payment', error };
    }
  });

  // Update payment handler
  ipcMain.handle(IPC_CHANNELS.UPDATE_PAYMENT, async (event, { id, updates }) => {
    try {
      const payment = await Payment.findByPk(id);
      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }
      await payment.update(updates);
      return { success: true, message: 'Payment updated successfully', payment };
    } catch (error) {
      return { success: false, message: 'Error updating payment', error };
    }
  });

  // Delete payment handler
  ipcMain.handle(IPC_CHANNELS.DELETE_PAYMENT, async (event, { id }) => {
    try {
      const payment = await Payment.findByPk(id);
      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }
      await payment.destroy();
      return { success: true, message: 'Payment deleted successfully' };
    } catch (error) {
      return { success: false, message: 'Error deleting payment', error };
    }
  });
}

// Export channel names for use in renderer process
export { IPC_CHANNELS };
