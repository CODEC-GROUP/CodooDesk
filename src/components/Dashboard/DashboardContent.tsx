'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { DollarSign, ShoppingCart, Package, CreditCard, ChevronDown, TrendingUp } from 'lucide-react'
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'
import { safeIpcInvoke } from '@/lib/ipc'
import { LoadingSpinner } from '@/components/Shared/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/Shared/ui/ErrorAlert'
import type { FinanceDashboardData, SalesDashboardData, CustomerDashboardData } from '@/types/dashboard'
import type { RawInventoryDashboardData } from '@/types/inventory'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { Shop } from '@/types/Shop'
import { DateRange } from "react-day-picker"
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { EmptyPlaceholder } from "@/components/Shared/ui/empty-placeholder"
import { Alert, AlertDescription } from "@/components/Shared/ui/alert"
import { IPC_CHANNELS } from '@/constants/ipcChannels'

interface ShopResponse {
  success: boolean;
  shops: Shop[];
}

// Add interface for the complete dashboard data
interface DashboardData {
  finance: FinanceDashboardData;
  inventory: RawInventoryDashboardData;  // Changed from InventoryDashboardData to RawInventoryDashboardData
  sales: SalesDashboardData;
  customers: CustomerDashboardData;
}

interface CategoryData {
  id: string;
  name: string;
  totalValue: number;
  color: string;
}

// Update the view type to include hours and minutes
type TimeView = 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly';

const CircularProgressBar = ({ percentage, color }: { percentage: number, color: string }) => (
  <div className="relative w-32 h-32">
    <svg className="w-full h-full" viewBox="0 0 100 100">
      <circle
        className="text-gray-200 stroke-current"
        strokeWidth="10"
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
      ></circle>
      <circle
        className={`${color} stroke-current`}
        strokeWidth="10"
        strokeLinecap="round"
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        strokeDasharray={`${percentage * 2.51327} 251.327`}
        transform="rotate(-90 50 50)"
      ></circle>
    </svg>
    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
      {percentage}%
    </span>
  </div>
)

// Add null check and number validation
function formatNumber(num: number | null): string {
  if (typeof num !== 'number' || isNaN(num)) return '0' // Handle NaN/undefined
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  } else {
    return num.toString()
  }
}

// Add loading and empty state components
const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-[300px] bg-gray-200 rounded-lg" />
  </div>
);

const EmptyChart = ({ message }: { message: string }) => (
  <EmptyPlaceholder>
    <div className="flex flex-col items-center justify-center h-[300px]">
      <Package className="h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-semibold">{message}</h3>
    </div>
  </EmptyPlaceholder>
);

// Add this generic empty state component
const EmptyData = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center h-full p-8">
    <Package className="h-12 w-12 text-muted-foreground mb-4" />
    <p className="text-muted-foreground text-center">{message}</p>
  </div>
);

// Update the categories chart component
const CategoryChart = ({ data, isLoading, error }: { 
  data: CategoryData[] | undefined, 
  isLoading: boolean, 
  error: Error | null 
}) => {
  if (isLoading) return <ChartSkeleton />;
  if (error) return (
    <Alert variant="destructive">
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
  if (!data?.length) return <EmptyChart message="No category data available" />;

  const totalCategoryValue = data.reduce((sum: number, cat: CategoryData) => sum + cat.totalValue, 0) || 1;

  return (
    <div className="flex justify-between items-center flex-1">
      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              dataKey="totalValue"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="95%"
              paddingAngle={0}
              labelLine={false}
            >
              {data.map((entry: CategoryData, index: number) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => `${formatNumber(value as number)} FCFA`}
              contentStyle={{ 
                background: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                color: 'hsl(var(--foreground))'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {data.map((category: CategoryData) => (
          <div key={category.id} className="flex justify-between text-sm">
            <span className="flex items-center">
              <span 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: category.color }}
              />
              {category.name}:
            </span>
            <span className="font-medium">
              {((category.totalValue / totalCategoryValue) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Update the filter controls
interface FilterControlsProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  currentView: TimeView;
  setCurrentView: (view: TimeView) => void;
  currentShopId: string | null;
  setCurrentShopId: (id: string) => void;
  user: any;
  shopObjects: Shop[];
}

const FilterControls = ({ 
  date, 
  setDate,
  currentView,
  setCurrentView,
  currentShopId,
  setCurrentShopId,
  user,
  shopObjects
}: FilterControlsProps) => {
  const { t } = useTranslation();
  
  const renderShopSelector = () => {
    // Allow shop owners with multiple shops to see the selector
    const shouldShow = (user?.role === 'admin' || user?.role === 'shop_owner') && 
                      shopObjects.length > 0; // Show if any shops exist
    
    if (!shouldShow) return null;

    return (
      <Select
        value={currentShopId || ''}
        onValueChange={setCurrentShopId}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Shops" />
        </SelectTrigger>
        <SelectContent>
          {shopObjects.length > 1 && <SelectItem value="">All Shops</SelectItem>}
          {shopObjects.map(shop => (
            <SelectItem key={shop.id} value={shop.id}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };
  
  return (
    <div className="flex items-center gap-4 mb-6">
      <DateRangePicker
        value={date}
        onChange={setDate}
      />
      {renderShopSelector()}
      <Select
        value={currentView}
        onValueChange={setCurrentView}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('View')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="minutes">{t('Minutes')}</SelectItem>
          <SelectItem value="hourly">{t('Hourly')}</SelectItem>
          <SelectItem value="daily">{t('Daily')}</SelectItem>
          <SelectItem value="weekly">{t('Weekly')}</SelectItem>
          <SelectItem value="monthly">{t('Monthly')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// Update chart formatters
const formatTimeLabel = (value: string, view: TimeView) => {
  switch (view) {
    case 'minutes':
      return new Date(value).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    case 'hourly':
      return new Date(value).toLocaleTimeString([], { hour: '2-digit' });
    case 'daily':
      return new Date(value).toLocaleDateString();
    case 'weekly':
      return `Week ${value}`;
    case 'monthly':
      return value;
    default:
      return value;
  }
};

// Add these constants at the top
const CARD_CLASSES = "rounded-xl shadow-sm hover:shadow-md transition-shadow";
const CHART_CONTAINER = "h-[300px] mt-4";
const GRID_LAYOUT = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6";

interface DashboardParams {
  businessId: string;
  shopId?: string;
  shopIds?: string[];
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface DashboardApiParams {
  businessId: string;
  shopId?: string;
  shopIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

interface CategoryBreakdownItem {
  id: string;
  name: string;
  total_value: number;
  percentage: number;
  color: string;
}

// Add type declarations for the API responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface InventoryStats {
  total_products_sold: number;
  total_value: number;
}

interface SalesStats {
  total_sales: number;
  total_revenue: number;
  total_orders: number;
  total_expenses: number;
}

interface SalesTrend {
  date: string;
  total_sales: number;
  transaction_count: number;
}

interface Supplier {
  id: string;
  name: string;
  items: number;
  value: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  featuredImage: string | null;
  sellingPrice: number;
  unitsSold: number;
  currentStock: number;
}

interface FinanceTimeSeriesData {
  date: string;
  income: number;
  expenses: number;
}

export function Dashboard() {
  const { business, user, availableShops } = useAuthLayout();
  const [currentShopId, setCurrentShopId] = useState<string | null>(() => {
    if (user?.role !== 'admin' && user?.role !== 'shop_owner') {
      return availableShops?.[0]?.id || null;
    }
    return null;
  });
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [currentView, setCurrentView] = useState<TimeView>('daily');
  const { t } = useTranslation();

  // Update shop objects handling
  const shopObjects = (user?.role === 'admin' || user?.role === 'shop_owner')
    ? business?.shops || []
    : availableShops?.filter(Boolean) || [];

  // Get the employee's assigned shop ID
  const employeeShopId = user?.role !== 'admin' && user?.role !== 'shop_owner' 
    ? availableShops?.[0]?.id || currentShopId 
    : currentShopId;

  const params: DashboardApiParams = {
    businessId: business?.id!,
    ...(employeeShopId ? { shopId: employeeShopId } : {}),
    ...(date?.from && date?.to ? {
      dateRange: {
        start: date.from.toISOString(),
        end: date.to.toISOString()
      }
    } : {})
  };

  const safeInvoke = async <T,>(channel: string, params: DashboardApiParams): Promise<ApiResponse<T>> => {
    if (!window?.electron?.invoke) {
      throw new Error('Electron invoke not available');
    }
    return window.electron.invoke(channel, params);
  };

  // Fetch inventory stats
  const { data: inventoryStats, isLoading: isLoadingInventory } = useQuery<ApiResponse<InventoryStats>>({
    queryKey: ['inventoryStats', params],
    queryFn: () => safeInvoke('dashboard:inventory:stats', params),
    enabled: !!business?.id
  });

  // Fetch inventory movements
  const { data: inventoryMovements } = useQuery({
    queryKey: ['inventoryMovements', params],
    queryFn: () => safeInvoke('dashboard:inventory:movements', params),
    enabled: !!business?.id
  });

  // Fetch top products
  const { data: topProducts } = useQuery<ApiResponse<Product[]>>({
    queryKey: ['topProducts', params],
    queryFn: async () => {
      console.log('Fetching top products with params:', params);
      const result = await safeInvoke<Product[]>('dashboard:inventory:products', params);
      console.log('Top Products response:', result);
      return result;
    },
    enabled: !!business?.id
  });

  // Fetch top customers
  const { data: topCustomers } = useQuery<ApiResponse<any[]>>({
    queryKey: ['topCustomers', params],
    queryFn: async () => {
      console.log('Fetching top customers with params:', params);
      const result = await safeInvoke<any[]>('dashboard:customers:top', params);
      console.log('Top Customers response:', result);
      return result;
    },
    enabled: !!business?.id
  });

  // Fetch sales stats
  const { data: salesStats, isLoading: isLoadingSales } = useQuery<ApiResponse<SalesStats[]>>({
    queryKey: ['salesStats', params],
    queryFn: () => safeInvoke('dashboard:sales:stats', params),
    enabled: !!business?.id
  });

  // Fetch sales trends
  const { data: salesTrends } = useQuery<ApiResponse<SalesTrend[]>>({
    queryKey: ['salesTrends', params],
    queryFn: () => safeInvoke('dashboard:sales:trends', params),
    enabled: !!business?.id
  });

  // Fetch category breakdown
  const { data: categoryBreakdown, isLoading: isLoadingCategories } = useQuery<ApiResponse<CategoryBreakdownItem[]>>({
    queryKey: ['categoryBreakdown', params],
    queryFn: () => safeInvoke('dashboard:categories:breakdown', params),
    enabled: !!business?.id
  });

  // Add new query for finance time series
  const { data: financeTimeSeries, isLoading: isLoadingFinance } = useQuery({
    queryKey: ['financeTimeSeries', params],
    queryFn: async () => {
      console.log('Fetching finance time series with params:', params);
      const result = await safeInvoke<FinanceTimeSeriesData[]>('dashboard:finance:timeSeries', params);
      console.log('Finance time series response:', result);
      return result;
    },
    enabled: !!business?.id
  });

  // Add console logs to inspect the data
  useEffect(() => {
    console.log('=== Finance Time Series Frontend Debug ===');
    console.log('Loading state:', isLoadingFinance);
    console.log('Raw response:', financeTimeSeries);
    console.log('Data array:', financeTimeSeries?.data);
    console.log('Data length:', financeTimeSeries?.data?.length);
    console.log('First item:', financeTimeSeries?.data?.[0]);
    console.log('Params used:', params);

    // Log category breakdown
    console.log('Category Breakdown Response:', categoryBreakdown);
  }, [financeTimeSeries, isLoadingFinance, params, categoryBreakdown]);

  if (isLoadingInventory || isLoadingSales || isLoadingCategories || isLoadingFinance) {
    return <LoadingSpinner />;
  }

  console.log('Sales Stats:', salesStats?.data);
  
  // Update inventory card to show products sold
  const renderInventoryCard = () => {
    const stats = inventoryStats?.data || { total_products_sold: 0, total_value: 0 };
    return (
      <Card className={CARD_CLASSES}>
        <CardContent className="p-4 md:p-6 flex items-center gap-4">
          <div className="bg-purple-100/80 p-2 rounded-lg">
            <Package className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Products Sold</p>
            <h3 className="text-2xl font-semibold">
              {formatNumber((salesStats?.data?.[0]?.total_orders || 0))}
            </h3>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-muted/40 min-h-screen">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('Dashboard')}</h1>
          <FilterControls 
            date={date} 
            setDate={setDate}
            currentView={currentView}
            setCurrentView={setCurrentView}
            currentShopId={currentShopId}
            setCurrentShopId={setCurrentShopId}
            user={user}
            shopObjects={shopObjects}
          />
        </div>

        {/* Overview Cards */}
        <div className={GRID_LAYOUT}>
          <Card className={CARD_CLASSES}>
            <CardContent className="p-4 md:p-6 flex items-center gap-4">
              <div className="bg-blue-100/80 p-2 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-semibold">
                  {formatNumber((salesStats?.data?.[0]?.total_revenue || 0))} FCFA
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className={CARD_CLASSES}>
            <CardContent className="p-4 md:p-6 flex items-center gap-4">
              <div className="bg-red-100/80 p-2 rounded-lg">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <h3 className="text-2xl font-semibold">
                  {formatNumber((salesStats?.data?.[0]?.total_expenses || 0))} FCFA
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className={CARD_CLASSES}>
            <CardContent className="p-4 md:p-6 flex items-center gap-4">
              <div className="bg-purple-100/80 p-2 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products Sold</p>
                <h3 className="text-2xl font-semibold">
                  {formatNumber((salesStats?.data?.[0]?.total_orders || 0))}
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className={CARD_CLASSES}>
            <CardContent className="p-4 md:p-6 flex items-center gap-4">
              <div className="bg-green-100/80 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <h3 className="text-2xl font-semibold">
                  {formatNumber((salesStats?.data?.[0]?.total_revenue || 0) - (salesStats?.data?.[0]?.total_expenses || 0))} FCFA
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
          <Card className={`${CARD_CLASSES} col-span-2`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {!(salesTrends?.data || []).length ? (
                <EmptyData message="No sales data available" />
              ) : (
                <div className={CHART_CONTAINER}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesTrends?.data || []}>
                      <CartesianGrid strokeDasharray="3 3" className="text-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fill: '#6b7280' }}
                        tickLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="total_sales" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                        fillOpacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className={CARD_CLASSES}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Categories Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-[500px] flex flex-col">
              {!categoryBreakdown?.data?.length ? (
                <EmptyChart message="No category data available" />
              ) : (
                <div className="flex justify-between items-center flex-1">
                  <div className="w-full h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={categoryBreakdown.data}
                          dataKey="total_value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="95%"
                          paddingAngle={0}
                          labelLine={false}
                        >
                          {categoryBreakdown.data.map((entry: CategoryBreakdownItem, index: number) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              stroke="hsl(var(--background))"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `${formatNumber(value as number)} FCFA`}
                          contentStyle={{ 
                            background: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {categoryBreakdown.data.map((category) => (
                      <div key={category.id} className="flex justify-between text-sm">
                        <span className="flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}:
                        </span>
                        <span className="font-medium">{category.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {!(topCustomers?.data || []).length ? (
                <EmptyData message="No customer data available" />
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Orders</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(topCustomers?.data || []).map((customer: any) => (
                        <tr key={customer.customer_id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                C
                              </div>
                              <div>
                                <p className="font-medium">Customer {customer.customer_id?.substring(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{customer.orderCount}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{formatNumber(customer.totalSpent)} FCFA</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {!(topProducts?.data || []).length ? (
                <EmptyData message="No product data available" />
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Units Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(topProducts?.data || []).map((product: any) => (
                        <tr key={product.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {product.featuredImage ? (
                                <Image
                                  src={product.featuredImage}
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                  className="rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <Package className="h-6 w-6 text-gray-600" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{formatNumber(product.sellingPrice * (product.unitsSold || 0))} FCFA</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{formatNumber(product.unitsSold || 0)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Restore the bottom cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Income & Expenses Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-between">
                <div>
                  <h4 className="text-2xl font-bold">{formatNumber((salesStats?.data?.[0]?.total_revenue || 0))} FCFA</h4>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                </div>
                <div className="text-right">
                  <h4 className="text-2xl font-bold">{formatNumber((salesStats?.data?.[0]?.total_expenses || 0))} FCFA</h4>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                </div>
              </div>
              {!(financeTimeSeries?.data || []).length ? (
                <EmptyData message="No financial data available" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financeTimeSeries?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => formatTimeLabel(value, currentView)}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => `${formatNumber(value as number)} FCFA`}
                      labelFormatter={(label) => formatTimeLabel(label as string, currentView)}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#3b82f6" 
                      name="Income"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#ef4444" 
                      name="Expenses"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last 7 Days Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="text-2xl font-bold">{formatNumber(salesTrends?.data?.slice(-7).reduce((sum, day) => sum + (day.transaction_count || 0), 0) || 0)}</h4>
                <p className="text-sm text-gray-500">Sales</p>
                <h4 className="text-2xl font-bold mt-2">{formatNumber(salesTrends?.data?.slice(-7).reduce((sum, day) => sum + (day.total_sales || 0), 0) || 0)} FCFA</h4>
                <p className="text-sm text-gray-500">Revenue</p>
              </div>
              {!(salesTrends?.data || []).length ? (
                <EmptyData message="No recent sales data" />
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={salesTrends?.data?.slice(-7) || []}>
                    <Bar 
                      dataKey="transaction_count" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={35}
                      fillOpacity={0.8}
                      name="Sales"
                    />
                    <Tooltip 
                      formatter={(value) => `${value} sales`}
                      contentStyle={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      labelFormatter={(label) => formatTimeLabel(label as string, 'daily')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
