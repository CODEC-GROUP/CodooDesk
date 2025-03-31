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
    profit_margin: number;
    income_coverage: number;
    operating_cash_flow: number;
    debt_to_income: number;
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

// Add CircularProgressBar component
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
);

interface ShopResponse {
  success: boolean;
  shops: Shop[];
}

// Update the FinancialHealthMetric component
const FinancialHealthMetric = ({ 
  title, 
  value, 
  unit = '%', 
  trend, 
  description,
  threshold,
  isPositiveUp = true
}: { 
  title: string; 
  value: number; 
  unit?: string; 
  trend?: 'up' | 'down'; 
  description: string;
  threshold: number;
  isPositiveUp?: boolean;
}) => {
  const isPositive = isPositiveUp ? value >= threshold : value <= threshold;
  const trendColor = isPositive ? 'text-green-500' : 'text-red-500';
  const trendIcon = isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  const trendText = isPositive ? '↑' : '↓';
  const percentageChange = Math.abs(value).toFixed(1);

  return (
    <div className="p-4 rounded-lg bg-card border">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold">
          {value.toFixed(1)}{unit}
        </p>
        <span className={`ml-2 ${trendColor} flex items-center gap-1`}>
          {trendIcon}
          <span className="text-sm">{percentageChange}{unit}</span>
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-2 text-xs text-muted-foreground">
        {isPositive ? 'Above' : 'Below'} target threshold of {threshold}{unit}
      </div>
    </div>
  );
};

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
                <Legend layout="vertical" align="right" verticalAlign="middle" />
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
            <h3 className="text-lg font-semibold mb-4">Financial Health Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FinancialHealthMetric
                title="Revenue Growth"
                value={financeData.overview.revenue_growth}
                threshold={0}
                isPositiveUp={true}
                description="Percentage increase in revenue compared to previous period"
              />
              <FinancialHealthMetric
                title="Expense Growth"
                value={financeData.overview.expense_growth}
                threshold={0}
                isPositiveUp={false}
                description="Percentage increase in expenses compared to previous period"
              />
              <FinancialHealthMetric
                title="Profit Margin"
                value={financeData.overview.profit_margin}
                threshold={20}
                isPositiveUp={true}
                description="Percentage of revenue that is profit"
              />
              <FinancialHealthMetric
                title="Income Coverage"
                value={financeData.overview.income_coverage}
                unit="x"
                threshold={1.5}
                isPositiveUp={true}
                description="Ratio of income to expenses"
              />
              <FinancialHealthMetric
                title="Operating Cash Flow"
                value={financeData.overview.operating_cash_flow}
                unit="x"
                threshold={1.2}
                isPositiveUp={true}
                description="Ability to cover expenses with operating income"
              />
              <FinancialHealthMetric
                title="Debt-to-Income"
                value={financeData.overview.debt_to_income}
                unit="x"
                threshold={0.4}
                isPositiveUp={false}
                description="Ratio of expenses to income"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Health Score</h3>
            <div className="flex flex-col items-center justify-center h-full">
              <CircularProgressBar 
                percentage={calculateHealthScore(financeData.overview)} 
                color="text-blue-600" 
              />
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Overall financial health score based on multiple metrics
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Add this helper function at the top of the file
const calculateHealthScore = (overview: FinanceData['overview']) => {
  let score = 0;
  const weights = {
    revenueGrowth: 0.2,
    expenseGrowth: 0.2,
    profitMargin: 0.2,
    incomeCoverage: 0.2,
    operatingCashFlow: 0.1,
    debtToIncome: 0.1
  };

  // Revenue Growth (0-100)
  score += Math.min(Math.max(overview.revenue_growth + 50, 0), 100) * weights.revenueGrowth;

  // Expense Growth (0-100)
  score += Math.min(Math.max(50 - overview.expense_growth, 0), 100) * weights.expenseGrowth;

  // Profit Margin (0-100)
  score += Math.min(Math.max(overview.profit_margin * 5, 0), 100) * weights.profitMargin;

  // Income Coverage (0-100)
  score += Math.min(Math.max((overview.income_coverage - 1) * 50, 0), 100) * weights.incomeCoverage;

  // Operating Cash Flow (0-100)
  score += Math.min(Math.max((overview.operating_cash_flow - 1) * 50, 0), 100) * weights.operatingCashFlow;

  // Debt-to-Income (0-100)
  score += Math.min(Math.max((1 - overview.debt_to_income) * 100, 0), 100) * weights.debtToIncome;

  return Math.round(score);
};
