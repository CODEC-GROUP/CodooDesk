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
  salesPersonName?: string;
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
   * Prints a receipt
   * @param businessInfo Business information for the receipt header
   * @param receipt Receipt data to print
   * @returns Promise<boolean> true if printing was successful, false otherwise
   */
  async printReceipt(businessInfo: PrinterBusinessInfo, receipt: PrinterReceiptData): Promise<boolean> {
    try {
      // Generate HTML content
      const htmlContent = this.generatePreviewHtml(businessInfo, receipt);
      
      // Open print preview window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Trigger print dialog
      printWindow.print();
      
      // Close window after printing (or cancel)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
      
      return true;
    } catch (error) {
      console.error('Error printing receipt:', error);
      return false;
    }
  }

  /**
   * Generates preview HTML for the receipt
   * @param businessInfo Business information for the receipt header
   * @param receipt Receipt data to display
   * @returns string HTML content for the receipt
   */
  generatePreviewHtml(businessInfo: PrinterBusinessInfo, receipt: PrinterReceiptData): string {
    const {
      fullBusinessName,
      shopLogo,
      address,
      shop
    } = businessInfo;

    const {
      receiptId,
      customerName,
      customerPhone,
      items,
      subtotal,
      discount,
      total,
      amountPaid,
      change,
      date,
      paymentMethod,
      salesPersonName
    } = receipt;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptId}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 10px;
            width: 100%;
            max-width: 80mm; /* Default max width for 80mm printers */
            margin: 0 auto;
          }
          .header, .footer, .totals, .receipt-info {
            width: 100%;
            box-sizing: border-box;
          }
          .items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items th, .items td {
            text-align: left;
            padding: 5px;
          }
          @media print {
            @page { margin: 0; }
            body {
              margin: 0;
              padding: 5mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${shopLogo ? `<img src="${shopLogo}" class="logo" alt="Shop Logo"/>` : ''}
          <div>${shop.name}</div>
          <div>${address.street}</div>
          <div>${address.city}, ${address.state}</div>
          <div>${address.country}</div>
        </div>

        <div class="receipt-info">
          <div>Receipt #: ${receiptId}</div>
          <div>Date: ${new Date(date).toLocaleString()}</div>
          ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
          ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${this.formatCurrency(item.sellingPrice)}</td>
                <td>${this.formatCurrency(item.quantity * item.sellingPrice)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(subtotal)}</span>
          </div>
          ${discount > 0 ? `
            <div class="total-line">
              <span>Discount:</span>
              <span>-${this.formatCurrency(discount)}</span>
            </div>
          ` : ''}
          <div class="total-line" style="font-weight: bold;">
            <span>Total:</span>
            <span>${this.formatCurrency(total)}</span>
          </div>
          <div class="total-line">
            <span>Amount Paid:</span>
            <span>${this.formatCurrency(amountPaid)}</span>
          </div>
          ${change > 0 ? `
            <div class="total-line">
              <span>Change:</span>
              <span>${this.formatCurrency(change)}</span>
            </div>
          ` : ''}
          <div class="total-line">
            <span>Payment Method:</span>
            <span>${paymentMethod}</span>
          </div>
        </div>

        <div class="footer">
          <div>Served by: ${salesPersonName || 'Staff'}</div>
          <div>Thank you for your business!</div>
        </div>
      </body>
      </html>
    `;
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
