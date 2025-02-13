export async function validatePayment(paymentData: any, saleAmount: number) {
  // Validate payment amount matches sale
  if (paymentData.amount !== saleAmount) {
    throw new Error('Payment amount does not match sale amount');
  }

  // Validate payment method
  if (!['cash', 'card', 'mobile_money', 'bank_transfer'].includes(paymentData.method)) {
    throw new Error('Invalid payment method');
  }

  // Additional validation for non-cash payments
  if (paymentData.method !== 'cash') {
    // Verify transaction reference
    if (!paymentData.transactionReference) {
      throw new Error('Transaction reference required for non-cash payments');
    }
    
    // Could add external payment gateway verification here
  }

  return true;
} 