"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Button } from "@/components/Shared/ui/button"
//import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { ArrowDown, ArrowUp, DollarSign, ShoppingCart, Users, CreditCard, Activity } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { PieChart, Pie, Cell } from 'recharts'
import { BarChart, Bar } from 'recharts'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'
import { LoadingSpinner } from '@/components/Shared/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/Shared/ui/ErrorAlert'
import { safeIpcInvoke } from '@/lib/ipc'
import { DASHBOARD_CHANNELS } from '@/constants/ipcChannels'
import { Shop } from '@/types/Shop'

interface FinanceOverview {
  total_income: number;
  totalOrders: number;
  totalItems: number;
  total_expenses: number;
  revenue_growth: number;
  expense_growth: number;
}

// Define an interface for the props
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType;
  color: string;
  trend?: string;
}

// Use the interface in the component definition
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => (
  <Card>
    <CardContent className="flex items-center p-6">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
        <div className="h-6 w-6 text-white">
          <Icon />
        </div>
      </div>
      <div className="ml-4 flex-grow">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-center">
          <h3 className="text-2xl font-bold">{value}</h3>
          {trend && (
            <span className={`ml-2 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </span>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
)

// Add before FinanceDashboardResponse
interface FinanceData {
  overview: {
    total_income: number;
    totalOrders: number;
    total_expenses: number;
    revenue_growth: number;
    expense_growth: number;
  };
  monthlyData: Array<{
    name: string;
    income: number;
    expenses: number;
  }>;
  expenseCategories: Array<{
    name: string;
    value: number;
  }>;
  topIncomeSources: Array<{
    name: string;
    value: number;
  }>;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }>;
}

interface FinanceDashboardResponse {
  success: boolean;
  message?: string;
  data?: FinanceData | null;
}

// Add near the top with other constants
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface ShopResponse {
  success: boolean;
  shops: Shop[];
}

export function FinancialReports() {
  const { business, user, availableShops } = useAuthLayout()
  const [selectedShopId, setSelectedShopId] = useState<string>(() => {
    // Default to first available shop for non-admin users
    if (user?.role !== 'admin' && user?.role !== 'shop_owner') {
      return availableShops?.[0]?.id || '';
    }
    return '';
  })
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setDate(1)), // First day of current month
    new Date()
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Update shop objects handling
  const shopObjects = (user?.role === 'admin' || user?.role === 'shop_owner')
    ? business?.shops || []
    : availableShops?.filter(Boolean) || []

  const [financeData, setFinanceData] = useState<FinanceData | null>(null)

  // Update the refreshData callback
  const refreshData = useCallback(async () => {
    if (!business?.id) return
    
    setLoading(true)
    setError(null)

    try {
      const response = await safeIpcInvoke<FinanceDashboardResponse>(
        DASHBOARD_CHANNELS.GET_FINANCE_DASHBOARD,
        {
          businessId: business.id,
          ...(selectedShopId ? { shopId: selectedShopId } : {}),
          ...(!selectedShopId && (user?.role === 'admin' || user?.role === 'shop_owner') 
            ? { shopIds: shopObjects.map(shop => shop.id) }
            : {}),
          dateRange: {
            start: dateRange[0].toISOString(),
            end: dateRange[1].toISOString()
          }
        },
        { success: false, data: null, message: '' }
      )

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch finance data')
      }

      setFinanceData(response.data || null)
    } catch (err) {
      console.error('Error fetching finance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch financial data')
    } finally {
      setLoading(false)
    }
  }, [business?.id, selectedShopId, dateRange, user?.role, shopObjects])

  // Add auto-refresh interval
  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 300000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [refreshData])

  // Add export functionality
  const handleExport = async () => {
    try {
      await safeIpcInvoke(
        'finance:export-report',
        {
          businessId: business?.id,
          dateRange,
          data: financeData
        },
        { success: false, message: '' }
      )
    } catch (err) {
      console.error('Export failed:', err)
      // Show error toast or message
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!financeData) return null

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <div className="flex gap-2">
          {(user?.role === 'admin' || user?.role === 'shop_owner') && shopObjects.length > 0 && (
            <Select
              value={selectedShopId}
              onValueChange={setSelectedShopId}
            >
              <SelectTrigger className="w-[180px]">
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
          )}
          <Select 
            value="This Month"
            onValueChange={(value) => {
              const now = new Date();
              let start = new Date();
              let end = new Date();

              switch (value) {
                case "This Week":
                  start = new Date(now.setDate(now.getDate() - now.getDay()));
                  end = new Date();
                  break;
                case "This Month":
                  start = new Date(now.getFullYear(), now.getMonth(), 1);
                  end = new Date();
                  break;
                case "This Quarter":
                  start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                  end = new Date();
                  break;
                case "This Year":
                  start = new Date(now.getFullYear(), 0, 1);
                  end = new Date();
                  break;
              }
              setDateRange([start, end]);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="This Week">This Week</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="This Quarter">This Quarter</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshData}>
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Income"
          value={`${(financeData.overview.total_income ?? 0).toLocaleString()} FCFA`}
          icon={DollarSign}
          color="bg-blue-100"
        />
        <StatCard
          title="Total Expenses"
          value={`${(financeData.overview.total_expenses ?? 0).toLocaleString()} FCFA`}
          icon={CreditCard}
          color="bg-red-100"
        />
        <StatCard
          title="Net Profit"
          value={`${(
            (financeData.overview.total_income || 0) - 
            (financeData.overview.total_expenses || 0)
          ).toLocaleString()} FCFA`}
          icon={Activity}
          color="bg-green-100"
        />
      </div>

      <div className="grid gap-6 mb-8 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={financeData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#8884d8" />
                <Line type="monotone" dataKey="expenses" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Categories</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={financeData.expenseCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {financeData.expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mb-8 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Income Sources</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financeData.topIncomeSources}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Ratio</h3>
            <StatCard
              title="Expense Ratio"
              value={`${(
                (financeData.overview.total_expenses / 
                (financeData.overview.total_income || 1)) * 100
              ).toFixed(1)}%`}
              icon={CreditCard}
              color="bg-orange-100"
              trend={
                (financeData.overview.total_expenses / 
                (financeData.overview.total_income || 1)) * 100 < 60 ? 'up' : 'down'
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mb-8 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Health</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{(financeData.overview.revenue_growth || 0).toFixed(1)}%
                </div>
                <div className="text-sm">Revenue Growth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  +{(financeData.overview.expense_growth || 0).toFixed(1)}%
                </div>
                <div className="text-sm">Expense Growth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(
                    (financeData.overview.total_income / 
                    (financeData.overview.total_expenses || 1)) 
                  ).toFixed(1)}x
                </div>
                <div className="text-sm">Income Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
