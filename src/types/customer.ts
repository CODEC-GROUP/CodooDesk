export interface CustomerAttributes {
  id: string;
  shop_id: string;  // Adding this to fix the WhereOptions error
  // ... other customer properties
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  customers?: CustomerAttributes[];  // Adding this to fix the customers property error
  // ... other segment properties
} 