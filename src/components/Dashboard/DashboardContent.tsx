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

export function Dashboard() {
  const { business, user, availableShops } = useAuthLayout();
  const [currentShopId, setCurrentShopId] = useState<string | null>(() => {
    // Default to first available shop for non-admin users
    if (user?.role !== 'admin' && user?.role !== 'shop_owner') {
      return availableShops?.[0]?.id || null;
    }
    return null; // Admins see all shops by default
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<TimeView>('daily');

  // Update shop objects handling
  const shopObjects = (user?.role === 'admin' || user?.role === 'shop_owner')
    ? business?.shops || []
    : availableShops?.filter(Boolean) || [];

  const { data: categoriesData, isLoading: isCategoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['topCategories', business?.id, currentShopId, date?.from, date?.to, currentView],
    queryFn: async () => {
      const response = await safeIpcInvoke<{ success: boolean; data: CategoryData[] }>(
        'dashboard:categories:top',
        { 
          businessId: business?.id,
          shopId: currentShopId,
          dateRange: date ? {
            start: date.from?.toISOString(),
            end: date.to?.toISOString()
          } : undefined,
          view: currentView
        },
        { success: false, data: [] }
      );
      return response?.data ?? [];
    },
    enabled: !!business?.id
  });

  // Fetch dashboard data with shop filtering
  const fetchDashboardData = async () => {
    if (!business?.id) return;
    
    try {
      setLoading(true);
      
      // Update shop filter based on role and selection
      const shopFilter = currentShopId 
        ? { shopId: currentShopId }
        : (user?.role === 'admin' || user?.role === 'shop_owner')
          ? { shopIds: shopObjects.map(shop => shop.id) }
          : {};

      const dateFilter = date ? {
        dateRange: {
          start: date.from?.toISOString(),
          end: date.to?.toISOString()
        }
      } : {};

      const viewFilter = {
        view: currentView
      };

      // Update other dashboard data fetching with filters
      const [financeRes, inventoryRes, salesRes, customersRes] = await Promise.all([
        safeIpcInvoke<{ success: boolean; data: FinanceDashboardData }>(
          'dashboard:finance:get',
          {
            businessId: business.id,
            ...shopFilter,
            ...dateFilter,
            ...viewFilter
          },
          {
            success: true,
            data: {
              overview: {
                total_income: 0,
                total_expenses: 0,
                revenue_growth: 0,
                expense_growth: 0,
                totalOrders: 0
              },
              expenseCategories: [],
              topIncomeSources: [],
              recentTransactions: [],
              monthlyData: []
            }
          }
        ),
        
        safeIpcInvoke<{ success: boolean; data: RawInventoryDashboardData }>(
          'dashboard:inventory:get',
          {
            businessId: business.id,
            ...shopFilter,
            ...dateFilter,
            ...viewFilter
          },
          {
            success: true,
            data: {
              stats: {
                total_value: 0,
                low_stock_items: 0,
                out_of_stock_items: 0,
                total_products: 0,
                shop_stats: {}
              },
              trends: {
                weekly: [],
                daily: [],
                value: [],
                topProducts: [],
                topSuppliers: []
              }
            }
          }
        ),
        
        safeIpcInvoke<{ success: boolean; data: SalesDashboardData }>(
          'dashboard:sales:get',
          {
            businessId: business.id,
            ...shopFilter,
            ...dateFilter,
            ...viewFilter
          },
          {
            success: true,
            data: {
              weeklyTrends: [],
              dailyTrends: [],
              weeklyStats: {
                totalItems: 0,
                totalRevenue: 0
              }
            }
          }
        ),
        
        safeIpcInvoke<{ success: boolean; data: CustomerDashboardData }>(
          'dashboard:customer:get',
          {
            businessId: business.id,
            ...shopFilter,
            ...dateFilter,
            ...viewFilter
          },
          {
            success: true,
            data: {
              stats: {
                total_customers: 0,
                active_customers: 0
              },
              topCustomers: []
            }
          }
        )
      ]);

      // Set data even if some requests failed
      setDashboardData({
        finance: financeRes?.data ?? {
          overview: {
            total_income: 0,
            total_expenses: 0,
            revenue_growth: 0,
            expense_growth: 0,
            totalOrders: 0
          },
          expenseCategories: [],
          topIncomeSources: [],
          recentTransactions: [],
          monthlyData: []
        },
        inventory: inventoryRes?.data ?? {
          stats: {
            total_value: 0,
            low_stock_items: 0,
            out_of_stock_items: 0,
            total_products: 0,
            shop_stats: {}
          },
          trends: {
            weekly: [],
            daily: [],
            value: [],
            topProducts: [],
            topSuppliers: []
          }
        },
        sales: salesRes?.data ?? {
          weeklyTrends: [],
          dailyTrends: [],
          weeklyStats: {
            totalItems: 0,
            totalRevenue: 0
          }
        },
        customers: customersRes?.data ?? {
          stats: {
            total_customers: 0,
            active_customers: 0
          },
          topCustomers: []
        }
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Update effect to refetch when filters change
  useEffect(() => {
    fetchDashboardData();
  }, [currentShopId, date?.from, date?.to, currentView]);

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    fetchDashboardData();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!dashboardData) return null;

  const { finance, inventory, sales, customers } = dashboardData;

  // Update inventory data usage
  const renderInventoryCard = () => (
    <Card>
      <CardContent className="flex items-center p-6">
        <div className="bg-purple-100 p-3 rounded-full">
          <Package className="h-8 w-8 text-purple-600" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">Total Items</p>
          <h3 className="text-2xl font-bold text-gray-700">
            {formatNumber(inventory?.stats?.total_products ?? 0)}
          </h3>
          <p className="text-sm text-red-500">
            {inventory?.stats?.low_stock_items ?? 0} low stock
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Update top products section
  const renderTopProducts = () => (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        {!inventory?.trends?.topProducts?.length ? (
          <EmptyData message="No product data available" />
        ) : (
          <div className="space-y-4">
            {inventory?.trends?.topProducts?.map((product, index) => (
              <div key={index} className="flex items-center">
                {product.featuredImage ? (
                  <Image
                    src={product.featuredImage}
                    alt={product.name}
                    width={40}
                    height={40}
                    className="rounded-lg object-cover mr-4"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <Package className="h-6 w-6 text-gray-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-500">{formatNumber(product.value)} FCFA</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{product.quantity} units in stock</p>
                  {product.quantity <= (product.reorderPoint ?? 10) && (
                    <p className="text-sm text-red-500">Low Stock</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-muted/40 min-h-screen">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('Dashboard')}</h1>
          <FilterControls 
            date={date} 
            setDate={handleDateChange}
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
                  {formatNumber(sales?.weeklyStats?.totalRevenue || 0)} FCFA
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
                  {formatNumber(
                    (finance.overview.total_income || 0) - 
                    (finance.overview.total_expenses || 0)
                  )} FCFA
                </h3>
              </div>
            </CardContent>
          </Card>
          {renderInventoryCard()}
          <Card className={CARD_CLASSES}>
            <CardContent className="p-4 md:p-6 flex items-center gap-4">
              <div className="bg-red-100/80 p-2 rounded-lg">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <h3 className="text-2xl font-semibold">
                  {formatNumber(finance.overview.total_expenses)} FCFA
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
              {!sales?.weeklyTrends?.length ? (
                <EmptyData message="No sales data available" />
              ) : (
                <div className={CHART_CONTAINER}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sales?.weeklyTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="text-muted" />
                      <XAxis
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
                        dataKey="sales" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
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
              <div className="flex-1">
                {isCategoriesLoading ? (
                  <ChartSkeleton />
                ) : categoriesError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{categoriesError.message}</AlertDescription>
                  </Alert>
                ) : !categoriesData?.length ? (
                  <EmptyChart message="No category data available" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoriesData}
                        dataKey="totalValue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="95%"
                        paddingAngle={0}
                        strokeWidth={2}
                      >
                        {categoriesData?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
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
                      <Legend 
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        formatter={(value, entry) => {
                          const total = categoriesData?.reduce((sum, cat) => sum + cat.totalValue, 0) || 1;
                          const percent = ((entry.value as number) / total) * 100;
                          return (
                            <span className="text-sm text-muted-foreground">
                              {value} - {percent.toFixed(1)}%
                            </span>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {!customers?.topCustomers?.length ? (
                <EmptyData message="No customer data available" />
              ) : (
                <div className="space-y-4">
                  {customers?.topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center">
                      <div className={`w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-4`}>
                        {customer.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{customer.name}</h3>
                        <p className="text-sm text-gray-500">{customer.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(customer.spent)} FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {renderTopProducts()}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Income Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-between">
                <div>
                  <h4 className="text-2xl font-bold">{formatNumber(finance.overview.totalOrders)}</h4>
                  <p className="text-sm text-gray-500">Orders Today</p>
                </div>
                <div>
                  <h4 className="text-2xl font-bold">{formatNumber(finance.overview.total_income)} FCFA</h4>
                  <p className="text-sm text-gray-500">Revenue Today</p>
                </div>
              </div>
              {!finance.monthlyData?.length ? (
                <EmptyData message="No financial data available" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={finance.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tickFormatter={(value) => formatTimeLabel(value, currentView)}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => `${formatNumber(value as number)} FCFA`}
                      labelFormatter={(label) => formatTimeLabel(label, currentView)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#8884d8" name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="#82ca9d" name="Expenses" />
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
                <h4 className="text-2xl font-bold">{formatNumber(sales?.weeklyStats.totalItems || 0)}</h4>
                <p className="text-sm text-gray-500">Items Sold</p>
                <h4 className="text-2xl font-bold mt-2">{formatNumber(sales?.weeklyStats.totalRevenue || 0)} FCFA</h4>
                <p className="text-sm text-gray-500">Revenue</p>
              </div>
              {!sales?.dailyTrends?.length ? (
                <EmptyData message="No recent sales data" />
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={sales?.dailyTrends || []}>
                    <Bar dataKey="sales" fill="#10B981" />
                    <Tooltip />
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