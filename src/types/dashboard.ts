import { InventoryDashboardData } from './inventory';

export interface SalesTrend {
  day: string;
  sales: number;
}

export interface SalesStats {
  totalItems: number;
  totalRevenue: number;
}

export interface SalesDashboardData {
  weeklyTrends: SalesTrend[];
  dailyTrends: SalesTrend[];
  weeklyStats: SalesStats;
}

export interface CustomerData {
  name: string;
  orders: number;
  spent: number;
}

export interface CustomerDashboardData {
  stats: {
    total_customers: number;
    active_customers: number;
  };
  topCustomers: CustomerData[];
}

export interface ExpenseCategory {
  name: string;
  value: number;
}

export interface IncomeSource {
  name: string;
  value: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

export interface MonthlyData {
  name: string;
  income: number;
  expenses: number;
}

export interface FinanceDashboardData {
  overview: {
    total_income: number;
    total_expenses: number;
    revenue_growth: number;
    expense_growth: number;
    totalOrders: number;
  };
  expenseCategories: ExpenseCategory[];
  topIncomeSources: IncomeSource[];
  recentTransactions: Transaction[];
  monthlyData: MonthlyData[];
}

export interface DashboardData {
  finance: FinanceDashboardData;
  inventory: InventoryDashboardData;
  sales: SalesDashboardData;
  customers: CustomerDashboardData;
}

export interface DashboardResponse {
  // Add your dashboard response type definition here
}

export interface FinanceDashboardResponse {
  // Add your finance dashboard response type definition
}