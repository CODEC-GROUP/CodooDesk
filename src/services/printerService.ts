import { safeIpcInvoke } from '@/lib/ipc';    

export interface PrinterBusinessAddress {
  street: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
}

export interface PrinterBusinessInfo {
  fullBusinessName: string;
  shopLogo?: string;
  address: PrinterBusinessAddress;
  taxIdNumber?: string;
  shop: {
    id: string;
    name: string;
  };
}

export interface PrinterReceiptItem {
  name: string;
  quantity: number;
  sellingPrice: number;
}

export interface PrinterReceiptData {
  saleId: string;
  receiptId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: PrinterReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  change: number;
  date: Date;
  paymentMethod: string;
  salesPersonId: string;
  paymentStatus?: 'paid' | 'unpaid' | 'partially_paid';
}

export interface POSSaleResponse {
  success: boolean;
  message: string;
  sale: any;
  receipt: {
    saleId: string;
    receiptId: string;
    date: Date;
    items: PrinterReceiptItem[];
    customerName?: string;
    customerPhone?: string;
    subtotal: number;
    discount: number;
    total: number;
    amountPaid: number;
    change: number;
    paymentMethod: string;
    salesPersonId: string;
  };
}

export class PrinterService {
  /**
   * Detects if a printer is available
   * @returns Promise<boolean> true if printer is available, false otherwise
   */
  async detectPrinter(): Promise<boolean> {
    try {
      const result = await safeIpcInvoke<{ success: boolean; message?: string }>('printer:detect');
      return result?.success || false;
    } catch (error) {
      console.error('Error detecting printer:', error);
      return false;
    }
  }

  /**
   * Formats currency in French format
   * @param amount number to format
   * @returns string formatted amount
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
    }).format(amount);
  }

  /**
   * Generates preview HTML for the receipt
   * @param businessInfo Business information for the receipt header
   * @param receipt Receipt data to display
   * @returns string HTML content for the receipt
   */
  generatePreviewHtml(businessInfo: PrinterBusinessInfo, receipt: PrinterReceiptData): string {
    const { fullBusinessName, address, taxIdNumber, shop, shopLogo } = businessInfo;
    const fullAddress = `${address.street}, ${address.city}, ${address.state}${address.postalCode ? ` ${address.postalCode}` : ''}, ${address.country}`;
    const isInvoice = receipt.paymentStatus !== 'paid';

    return `
      <div class="receipt" style="font-family: monospace; max-width: 400px; margin: 0 auto; padding: 20px;">
        ${shopLogo ? `<div style="text-align: center; margin-bottom: 10px;"><img src="${shopLogo}" alt="Logo" style="max-width: 100px;" /></div>` : ''}
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">${fullBusinessName}</h2>
          <p style="margin: 5px 0;">${fullAddress}</p>
          ${taxIdNumber ? `<p style="margin: 5px 0;">RC: ${taxIdNumber}</p>` : ''}
          <h3 style="margin: 5px 0;">${shop.name}</h3>
          <h2 style="margin: 10px 0; border: 2px solid black; padding: 5px; display: inline-block;">
            ${isInvoice ? 'FACTURE' : 'REÇU'}
          </h2>
        </div>
        <div style="margin-bottom: 20px;">
          ${isInvoice ? 
            `<p>Facture N°: <strong>${receipt.saleId}</strong></p>` :
            `<p>Reçu N°: <strong>${receipt.receiptId}</strong></p>`
          }
          <p>Date: <strong>${new Date(receipt.date).toLocaleString('fr-FR')}</strong></p>
          ${receipt.customerName ? `<p>Client: <strong>${receipt.customerName}</strong></p>` : ''}
          ${receipt.customerPhone ? `<p>Tel: <strong>${receipt.customerPhone}</strong></p>` : ''}
          ${receipt.customerEmail ? `<p>Email: <strong>${receipt.customerEmail}</strong></p>` : ''}
        </div>
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left;">Article</th>
                <th style="text-align: right;">Qté</th>
                <th style="text-align: right;">Prix</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items.map(item => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 5px 0;">${item.name}</td>
                  <td style="text-align: right;">${item.quantity}</td>
                  <td style="text-align: right;">${this.formatCurrency(item.sellingPrice)}</td>
                  <td style="text-align: right;">${this.formatCurrency(item.quantity * item.sellingPrice)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
          <p style="display: flex; justify-content: space-between;">
            <span>Sous-total:</span>
            <strong>${this.formatCurrency(receipt.subtotal)}</strong>
          </p>
          ${receipt.discount > 0 ? `
            <p style="display: flex; justify-content: space-between;">
              <span>Remise:</span>
              <strong>-${this.formatCurrency(receipt.discount)}</strong>
            </p>
          ` : ''}
          <p style="display: flex; justify-content: space-between; font-size: 1.2em;">
            <span>Total:</span>
            <strong>${this.formatCurrency(receipt.total)}</strong>
          </p>
          ${isInvoice ? `
            <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">
              <p style="text-align: center; font-weight: bold;">STATUT: ${receipt.paymentStatus === 'partially_paid' ? 'PARTIELLEMENT PAYÉ' : 'NON PAYÉ'}</p>
              ${receipt.paymentStatus === 'partially_paid' ? `
                <p style="display: flex; justify-content: space-between;">
                  <span>Montant Payé:</span>
                  <strong>${this.formatCurrency(receipt.amountPaid)}</strong>
                </p>
                <p style="display: flex; justify-content: space-between;">
                  <span>Reste à Payer:</span>
                  <strong>${this.formatCurrency(receipt.total - receipt.amountPaid)}</strong>
                </p>
              ` : ''}
            </div>
          ` : `
            <p style="display: flex; justify-content: space-between;">
              <span>Payé (${receipt.paymentMethod}):</span>
              <strong>${this.formatCurrency(receipt.amountPaid)}</strong>
            </p>
            <p style="display: flex; justify-content: space-between;">
              <span>Monnaie:</span>
              <strong>${this.formatCurrency(receipt.change)}</strong>
            </p>
          `}
        </div>
        <div style="margin-top: 20px; text-align: center;">
          ${isInvoice ? 
            `<p style="margin: 5px 0; font-style: italic;">Cette facture est valable pour une durée de 30 jours.</p>` :
            `<p style="margin: 5px 0;">Merci de votre confiance!</p>`
          }
          <p style="margin: 5px 0;">À bientôt!</p>
        </div>
      </div>
    `;
  }

  /**
   * Prints a receipt
   * @param businessInfo Business information for the receipt header
   * @param receipt Receipt data to print
   * @returns Promise<boolean> true if printing was successful, false otherwise
   */
  async printReceipt(businessInfo: PrinterBusinessInfo, receipt: PrinterReceiptData): Promise<boolean> {
    try {
      const html = this.generatePreviewHtml(businessInfo, receipt);
      const result = await safeIpcInvoke<{ success: boolean; message?: string }>('printer:print', { html });
      return result?.success || false;
    } catch (error) {
      console.error('Error printing receipt:', error);
      return false;
    }
  }

  /**
   * Creates a receipt data object from a sale response
   * @param response POS sale response containing receipt data
   * @returns PrinterReceiptData formatted receipt data
   */
  createReceiptFromSaleResponse(response: POSSaleResponse): PrinterReceiptData {
    const { receipt } = response;
    return {
      saleId: receipt.saleId,
      receiptId: receipt.receiptId,
      customerName: receipt.customerName,
      customerPhone: receipt.customerPhone,
      items: receipt.items,
      subtotal: receipt.subtotal,
      discount: receipt.discount,
      total: receipt.total,
      amountPaid: receipt.amountPaid,
      change: receipt.change,
      date: new Date(receipt.date),
      paymentMethod: receipt.paymentMethod,
      salesPersonId: receipt.salesPersonId
    };
  }
}

export default PrinterService;
