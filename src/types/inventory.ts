export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  movementType: 'added' | 'sold' | 'returned' | 'adjustment' | 'transfer';
  quantity: number;
  direction: 'inbound' | 'outbound' | 'transfer';
  source_inventory_id: string;
  destination_inventory_id?: string;
  reason?: string;
  performedBy_id: string;
  physical_count?: number;
  system_count?: number;
  discrepancy?: number;
  cost_per_unit: number;
  total_cost: number;
  createdAt: Date;
  product?: {
    name: string;
    sku: string;
  };
  performer?: {
    username: string;
  };
  destination?: string;
}

export interface StockMovementResponse {
  success: boolean;
  movements?: StockMovement[];
  total?: number;
  pages?: number;
  message?: string;
}

export interface InventoryItemResponse {
  success: boolean;
  items?: InventoryItemWithDetails[];
  message?: string;
}

export interface InventoryItemWithDetails {
  id: string;
  product: {
    name: string;
    sku: string;
    description: string;
    category: string;
  };
  inventory: {
    id: string;
    name: string;
    shop: {
      id: string;
      name: string;
    };
  };
  quantity: number;
  minimum_quantity: number;
  maximum_quantity: number;
  reorder_point: number;
  unit_cost: number;
  selling_price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  supplier: {
    id: string;
    name: string;
    contact: string;
  };
  last_restock_date?: Date;
  total_value: number;
  sales_data?: {
    total_sold: number;
    total_revenue: number;
    last_sale_date?: Date;
  };
  transfer_data?: {
    incoming_transfers: number;
    outgoing_transfers: number;
    last_transfer_date?: Date;
  };
}

export interface BusinessInventoryStats {
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_products: number;
  shop_stats: {
    [shopId: string]: {
      inventory_value: number;
      product_count: number;
      low_stock_count: number;
    };
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  selling_price: number;
  totalValue: number;
  supplier: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: string;
  description: string;
  productsSold: number;
  productsLeft: number;
  returnsToShop: number;
  returnsToSupplier: number;
}

export interface InventoryListProps {
  items: InventoryItem[];
  onItemSelect?: (item: InventoryItem) => void;
  // Add other props as needed
}

export interface TopProduct {
  id: string;
  name: string;
  value: number;
  quantity: number;
  reorderPoint: number;
  featuredImage?: string;
}

export interface ShopInventoryStats {
  inventory_value: number;
  product_count: number;
  low_stock_count: number;
}

export interface InventoryTrendData {
  date: string;
  value: number;
}

export interface InventoryValueData {
  date: string;
  total_value: number;
}

export interface SupplierData {
  id: string;
  name: string;
  total_value: number;
  products_supplied: number;
}

// Raw data interface (used by DashboardContent.tsx)
export interface RawInventoryDashboardData {
  stats: {
    total_products: number;
    total_value: number;
    low_stock_items: number;
    out_of_stock_items: number;
    shop_stats: {
      [shopId: string]: {
        inventory_value: number;
        product_count: number;
        low_stock_count: number;
      };
    };
  };
  trends: {
    weekly: Array<{ day: string; count: number }>;
    daily: Array<{ day: string; count: number }>;
    value: Array<{ 
      time: string; 
      [key: string]: string | number;
    }>;
    topProducts: Array<{
      id: string;
      name: string;
      value: number;
      quantity: number;
      reorderPoint: number;
      featuredImage?: string;
    }>;
    topSuppliers: Array<{
      name: string;
      value: number;
      items: number;
      color: string;
    }>;
  };
}

// Dashboard component interface (used by InventoryDashboard.tsx)
export interface InventoryDashboardData {
  stats: {
    total_products: number;
    itemsSold: number;
    lowStockItems: number;
    inventoryValue: number;
    inventoryValueChange: number;
    itemsAdded: number;
    valueAdded: number;
    valueOnLatest: number;
    valueOnPrevious: number;
    latestDate: string;
    previousDate: string;
  };
  weeklyInventory: Array<{ day: string; count: number }>;
  inventoryValueOverTime: Array<{ time: string; valueOnPrevious: number; valueOnLatest: number }>;
  last7DaysInventory: Array<{ day: string; count: number }>;
  topSuppliers: Array<{ name: string; items: number; value: number }>;
  topProducts: Array<{ image: string; name: string; amount: number; inStock: number }>;
  categoryDistribution: Array<{ name: string; value: number; color: string }>;
  trends: any[];
}

// Adapter function to transform between formats
export function adaptInventoryData(raw: RawInventoryDashboardData): InventoryDashboardData {
  const valueChange = calculateValueChange(raw.trends.value);
  
  return {
    stats: {
      total_products: raw.stats.total_products,
      itemsSold: calculateItemsSold(raw.trends.daily),
      lowStockItems: raw.stats.low_stock_items,
      inventoryValue: raw.stats.total_value,
      inventoryValueChange: valueChange,
      itemsAdded: calculateItemsAdded(raw.trends.daily),
      valueAdded: calculateValueAdded(raw.trends.value),
      valueOnLatest: raw.stats.total_value,
      valueOnPrevious: getPreviousValue(raw.trends.value),
      latestDate: new Date().toISOString(),
      previousDate: new Date(Date.now() - 86400000).toISOString(),
    },
    weeklyInventory: raw.trends.weekly,
    inventoryValueOverTime: raw.trends.value.map(v => ({
      time: v.time,
      valueOnPrevious: Number(v[Object.keys(v)[1]]),
      valueOnLatest: Number(v[Object.keys(v)[2]]) || 0,
    })),
    last7DaysInventory: raw.trends.daily,
    topSuppliers: raw.trends.topSuppliers.map(s => ({
      name: s.name,
      items: s.items,
      value: s.value,
    })),
    topProducts: raw.trends.topProducts.map(p => ({
      image: p.featuredImage || '',
      name: p.name,
      amount: p.value,
      inStock: p.quantity,
    })),
    categoryDistribution: [], // Derive from raw data if available
    trends: raw.trends.weekly,
  };
}

// Helper functions for calculations
function calculateValueChange(valueData: Array<{ time: string; [key: string]: string | number }>): number {
  // Implementation depends on your business logic
  return 0;
}

function calculateItemsSold(dailyData: Array<{ day: string; count: number }>): number {
  return dailyData.reduce((sum, day) => sum + day.count, 0);
}

function calculateItemsAdded(dailyData: Array<{ day: string; count: number }>): number {
  return dailyData.reduce((sum, day) => sum + day.count, 0);
}

function calculateValueAdded(valueData: Array<{ time: string; [key: string]: string | number }>): number {
  // Implementation depends on your business logic
  return 0;
}

function getPreviousValue(valueData: Array<{ time: string; [key: string]: string | number }>): number {
  if (valueData.length === 0) return 0;
  const lastEntry = valueData[valueData.length - 1];
  return Number(lastEntry[Object.keys(lastEntry)[1]]) || 0;
}

