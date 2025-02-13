'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { DollarSign, ShoppingCart, Package, CreditCard, ChevronDown } from 'lucide-react'
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

const formatNumber = (num: number): string => {
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

  return (
    <div className="flex justify-between items-center">
      <div className="w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="totalValue"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={60}
            >
              {data.map((entry: CategoryData, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => `${formatNumber(value as number)} FCFA`}
              contentStyle={{ background: 'white', border: '1px solid #e2e8f0' }}
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
              {((category.totalValue / (data.reduce((sum: number, cat: CategoryData) => sum + cat.totalValue, 0) || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Update the filter controls
const FilterControls = ({ 
  date, 
  setDate,
  currentView,
  setCurrentView,
  currentShopId,
  setCurrentShopId,
  availableShops,
  user
}: { 
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  currentView: TimeView;
  setCurrentView: (view: TimeView) => void;
  currentShopId: string | null;
  setCurrentShopId: (id: string) => void;
  availableShops: Shop[];
  user: any;
}) => {
  const { t } = useTranslation();
  
  const renderShopSelector = () => {
    if (availableShops.length <= 1) return null;

    return (
      <Select
        value={currentShopId || ''}
        onValueChange={(value) => setCurrentShopId(value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('Select Shop')} />
        </SelectTrigger>
        <SelectContent>
          {(user?.role === 'admin' || user?.role === 'Shop_owner') && (
            <SelectItem value="">All Shops</SelectItem>
          )}
          {availableShops.map(shop => (
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

export function Dashboard() {
  const { business, user } = useAuthLayout();
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<TimeView>('daily');

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

  // Fetch available shops based on user role
  useEffect(() => {
    const fetchShops = async () => {
      if (!business?.id || !user) return;

      try {
        const response = await safeIpcInvoke<{ success: boolean; shops: Shop[] }>(
          'entities:shop:get-all',
          {
            businessId: business.id,
            userId: user.id,
            role: user.role
          },
          { success: false, shops: [] }
        );

        if (response?.success) {
          setAvailableShops(response.shops);
          if (response.shops.length === 1) {
            setCurrentShopId(response.shops[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching shops:', error);
      }
    };

    fetchShops();
  }, [business?.id, user]);

  // Fetch dashboard data with shop filtering
  const fetchDashboardData = async () => {
    if (!business?.id) return;
    
    try {
      setLoading(true);
      
      // Determine shop filter based on role and selection
      const shopFilter = currentShopId 
        ? { shopId: currentShopId }
        : user?.role === 'admin' || user?.role === 'shop_owner'
          ? { shopIds: availableShops.map(shop => shop.id) }
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
          )) ?? []}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('Dashboard')}</h1>
        <FilterControls 
          date={date} 
          setDate={setDate}
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentShopId={currentShopId}
          setCurrentShopId={setCurrentShopId}
          availableShops={availableShops}
          user={user}
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-700">
                {formatNumber(finance.overview.total_income)} FCFA
              </h3>
              <p className={`text-sm ${finance.overview.revenue_growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {finance.overview.revenue_growth >= 0 ? '↑' : '↓'} {Math.abs(finance.overview.revenue_growth).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-green-100 p-3 rounded-full">
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <h3 className="text-2xl font-bold text-gray-700">
                {formatNumber(finance.overview.totalOrders)}
              </h3>
            </div>
          </CardContent>
        </Card>

        {renderInventoryCard()}

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-red-100 p-3 rounded-full">
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <h3 className="text-2xl font-bold text-gray-700">
                {formatNumber(finance.overview.total_expenses)} FCFA
              </h3>
              <p className={`text-sm ${finance.overview.expense_growth >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {finance.overview.expense_growth >= 0 ? '↑' : '↓'} {Math.abs(finance.overview.expense_growth).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {currentView === 'daily' ? 'Daily' : 
               currentView === 'weekly' ? 'Weekly' : 'Monthly'} Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sales?.weeklyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day"
                  tickFormatter={(value) => {
                    if (currentView === 'daily') return new Date(value).toLocaleDateString();
                    if (currentView === 'weekly') return `Week ${value}`;
                    return value; // monthly
                  }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `${formatNumber(value as number)} FCFA`}
                  labelFormatter={(label) => {
                    if (currentView === 'daily') return new Date(label).toLocaleDateString();
                    if (currentView === 'weekly') return `Week ${label}`;
                    return label; // monthly
                  }}
                />
                <Bar 
                  dataKey="sales" 
                  fill="#10B981"
                  name={t('Sales')}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <div className="grid grid-rows-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Categories Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <CircularProgressBar 
                percentage={
                  categoriesData?.length 
                    ? Math.round((categoriesData[0]?.totalValue / 
                        categoriesData.reduce((sum, cat) => sum + cat.totalValue, 0)) * 100)
                    : 0
                } 
                color="text-blue-400" 
              />
              <div className="space-y-2">
                {categoriesData?.slice(0, 3).map((category) => (
                  <div key={category.id} className="flex justify-between text-sm">
                    <span className="flex items-center">
                      <span 
                        className="w-2 h-2 rounded-full mr-2" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}:
                    </span>
                    <span className="font-medium">
                      {((category.totalValue / 
                        categoriesData.reduce((sum, cat) => sum + cat.totalValue, 0)) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryChart 
                data={categoriesData} 
                isLoading={isCategoriesLoading}
                error={categoriesError as Error}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
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
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={sales?.dailyTrends || []}>
                <Bar dataKey="sales" fill="#10B981" />
                <Tooltip />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}