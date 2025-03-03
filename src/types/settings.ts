export interface ShopSettings {
  shopId: string;
  currency: string;
  timezone: string;
  operatingHours: string;
  language: string;
  // Add other required fields
}

export interface ShopSettingsAttributes {
  id?: string;
  shopId: string;
  currency: string;
  timezone: string;
  language: string;
  operatingHours: {
    monday: { open: string; close: string } | null;
    tuesday: { open: string; close: string } | null;
    wednesday: { open: string; close: string } | null;
    thursday: { open: string; close: string } | null;
    friday: { open: string; close: string } | null;
    saturday: { open: string; close: string } | null;
    sunday: { open: string; close: string } | null;
  };
  lowStockThreshold: number;
  enableStockAlerts: boolean;
  enableCustomerLoyalty: boolean;
  pointsPerPurchase?: number;
  moneyPerPoint?: number;
  dateFormat: string;
  timeFormat: string;
  taxRate: number;
  invoicePrefix: string;
  receiptPrefix: string;
  orderPrefix: string;
  weightUnit: string;
  volumeUnit: string;
  lengthUnit: string;
} 