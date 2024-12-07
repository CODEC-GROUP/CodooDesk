"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Button } from "@/components/Shared/ui/button"
//import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { ArrowDown, ArrowUp, DollarSign, ShoppingCart, Users, CreditCard } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { PieChart, Pie, Cell } from 'recharts'
import { BarChart, Bar } from 'recharts'

// Mock data
const financialData = {
  totalRevenue: 100000,
  totalOrders: 1056,
  inventoryLevels: 48,
  totalExpenses: 5420,
}

const monthlyData = [
  { name: 'Jan', income: 20000, expenses: 15000 },
  { name: 'Feb', income: 22000, expenses: 16000 },
  { name: 'Mar', income: 25000, expenses: 18000 },
  { name: 'Apr', income: 27000, expenses: 19000 },
  { name: 'May', income: 30000, expenses: 22000 },
  { name: 'Jun', income: 32000, expenses: 24000 },
]

const expenseCategories = [
  { name: 'Salaries', value: 80000 },
  { name: 'Rent', value: 30000 },
  { name: 'Utilities', value: 20000 },
  { name: 'Supplies', value: 30000 },
  { name: 'Marketing', value: 20000 },
]

const topIncomeSources = [
  { name: 'Product Sales', value: 150000 },
  { name: 'Services', value: 80000 },
  { name: 'Subscriptions', value: 20000 },
]

const recentTransactions = [
  { id: 1, date: '2023-05-01', description: 'Product Sale', amount: 5000, type: 'income' },
  { id: 2, date: '2023-05-02', description: 'Office Rent', amount: 2500, type: 'expense' },
  { id: 3, date: '2023-05-03', description: 'Consulting Service', amount: 3000, type: 'income' },
  { id: 4, date: '2023-05-04', description: 'Utility Bill', amount: 500, type: 'expense' },
  { id: 5, date: '2023-05-05', description: 'Product Sale', amount: 4000, type: 'income' },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

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

export function FinancialReports() {
  const [dateRange, setDateRange] = useState('This Month')

  return (
    <div className="container mx-auto p-6 opacity-90 blur-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
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
          <Button variant="outline">Export</Button>
        </div>
      </div>

      <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${financialData.totalRevenue.toLocaleString()} FCFA`}
          icon={DollarSign}
          color="bg-blue-100"
          trend="up"
        />
        <StatCard
          title="Total Orders"
          value={financialData.totalOrders.toLocaleString()}
          icon={ShoppingCart}
          color="bg-green-100"
        />
        <StatCard
          title="Inventory Levels"
          value={financialData.inventoryLevels.toLocaleString()}
          icon={Users}
          color="bg-red-100"
        />
        <StatCard
          title="Total expenses"
          value={`${financialData.totalExpenses.toLocaleString()} FCFA`}
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
              <LineChart data={monthlyData}>
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
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseCategories.map((entry, index) => (
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
              <BarChart data={topIncomeSources}>
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
                {recentTransactions.map((transaction) => (
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
