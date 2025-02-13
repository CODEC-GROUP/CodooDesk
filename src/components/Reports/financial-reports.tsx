"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Button } from "@/components/Shared/ui/button"
//import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { ArrowDown, ArrowUp, DollarSign, ShoppingCart, Users, CreditCard } from "lucide-react"
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
    totalItems: number;
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
  const { business, user } = useAuthLayout()
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const [availableShops, setAvailableShops] = useState<Shop[]>([])
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setDate(1)), // First day of current month
    new Date()
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Similar shop fetching logic as Dashboard
  useEffect(() => {
    const fetchShops = async () => {
      if (!business?.id || !user) return
      
      try {
        const response = await safeIpcInvoke<ShopResponse>('entities:shop:get-all', {
          businessId: business.id,
          userId: user.id,
          role: user.role
        }, { success: false, shops: [] })

        if (response?.success) {
          setAvailableShops(response.shops)
          if (response.shops.length === 1) {
            setSelectedShopId(response.shops[0].id)
          }
        }
      } catch (err) {
        console.error('Error fetching shops:', err)
      }
    }

    fetchShops()
  }, [business?.id, user])

  const [financeData, setFinanceData] = useState<FinanceData | null>(null)

  // Add data refresh functionality
  const refreshData = useCallback(async () => {
    if (!business?.id) return
    
    setLoading(true)
    setError(null)

    try {
      // Determine shop filter based on role and selection
      const shopFilter = user?.role === 'admin' || user?.role === 'owner' 
        ? { shopIds: availableShops.map(shop => shop.id) }
        : { shopId: selectedShopId }

      const response = await safeIpcInvoke<FinanceDashboardResponse>(
        DASHBOARD_CHANNELS.GET_FINANCE_DASHBOARD,
        {
          businessId: business.id,
          ...shopFilter,
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
  }, [business?.id, selectedShopId, dateRange, user?.role, availableShops])

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
    <div className="container mx-auto p-6 opacity-90 blur-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <div className="flex gap-2">
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

      <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${financeData.overview.total_income.toLocaleString()} FCFA`}
          icon={DollarSign}
          color="bg-blue-100"
          trend="up"
        />
        <StatCard
          title="Total Orders"
          value={financeData.overview.totalOrders.toLocaleString()}
          icon={ShoppingCart}
          color="bg-green-100"
        />
        <StatCard
          title="Inventory Levels"
          value={financeData.overview.totalItems.toLocaleString()}
          icon={Users}
          color="bg-red-100"
        />
        <StatCard
          title="Total expenses"
          value={`${financeData.overview.total_expenses.toLocaleString()} FCFA`}
          icon={CreditCard}
          color="bg-purple-100"
          trend="down"
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
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeData.recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.amount.toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                        {transaction.type}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
