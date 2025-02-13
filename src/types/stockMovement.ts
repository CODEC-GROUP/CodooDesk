export interface StockMovement {
  id: string;
  type: 'in' | 'out' | 'transfer';
  date: string;
  quantity: number;
  performedBy_id: string;
  performedBy?: {
    id: string;
    name: string;
  };
  cost_per_unit: number;
  total_cost: number;
  // Add other required fields
} 