'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { DollarSign, ShoppingCart, Package, CreditCard, ChevronDown } from 'lucide-react'
import Image from 'next/image'

const weeklySalesData = [
  { day: 'Mon', sales: 320 },
  { day: 'Tue', sales: 450 },
  { day: 'Wed', sales: 180 },
  { day: 'Thu', sales: 270 },
  { day: 'Fri', sales: 340 },
  { day: 'Sat', sales: 260 },
  { day: 'Sun', sales: 100 },
]

const incomeOverTimeData = [
  { time: '4am', May21: 20, May22: 10 },
  { time: '5am', May21: 25, May22: 5 },
  { time: '6am', May21: 18, May22: 15 },
  { time: '7am', May21: 22, May22: 30 },
  { time: '8am', May21: 28, May22: 35 },
  { time: '9am', May21: 30, May22: 30 },
  { time: '10am', May21: 35, May22: 40 },
  { time: '11am', May21: 32, May22: 50 },
  { time: '12pm', May21: 28, May22: 45 },
  { time: '1pm', May21: 38, May22: 25 },
  { time: '2pm', May21: 42, May22: 35 },
  { time: '3pm', May21: 45, May22: 30 },
]

const last7DaysSalesData = [
  { day: '12', sales: 1000 },
  { day: '13', sales: 1200 },
  { day: '14', sales: 1100 },
  { day: '15', sales: 1300 },
  { day: '16', sales: 1400 },
  { day: '17', sales: 1800 },
  { day: '18', sales: 1600 },
]

const topCustomers = [
  { name: 'Lee Henry', orders: 52, spent: '21,765 XAF' },
  { name: 'Myrtle McBride', orders: 43, spent: '21,765 XAF' },
  { name: 'Lela Cannon', orders: 38, spent: '21,765 XAF' },
  { name: 'Jimmy Cook', orders: 34, spent: '21,765 XAF' },
]

const topProducts = [
  { name: 'Men White T-Shirt', amount: '11,456 XAF', unitsSold: 195, image: '/placeholder.svg?height=40&width=40' },
  { name: 'Women White T-Shirt', amount: '11,456 XAF', unitsSold: 146, image: '/placeholder.svg?height=40&width=40' },
  { name: 'Men Grey Hoodie', amount: '11,456 XAF', unitsSold: 110, image: '/placeholder.svg?height=40&width=40' },
  { name: 'Women Red T-Shirt', amount: '11,456 XAF', unitsSold: 87, image: '/placeholder.svg?height=40&width=40' },
]

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

export function Dashboard() {
  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen opacity-90 blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-700">{formatNumber(100000)} XAF</h3>
              <p className="text-sm text-green-500">↑ 10%</p>
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
              <h3 className="text-2xl font-bold text-gray-700">{formatNumber(1056)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-red-100 p-3 rounded-full">
              <Package className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inventory Levels</p>
              <h3 className="text-2xl font-bold text-gray-700">48</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-purple-100 p-3 rounded-full">
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <h3 className="text-2xl font-bold text-gray-700">{formatNumber(5420)} XAF</h3>
              <p className="text-sm text-red-500">↓ 5%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Sales Trend</CardTitle>
            <div className="flex items-center text-sm text-gray-500">
              Last Week <ChevronDown className="ml-1 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <div className="grid grid-rows-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Collections Sold</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <CircularProgressBar percentage={25} color="text-yellow-400" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Men:</span>
                  <span className="font-medium">10%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Women:</span>
                  <span className="font-medium">8%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Kids:</span>
                  <span className="font-medium">7%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Alpha', value: 30 },
                          { name: 'Beta', value: 40 },
                          { name: 'Delta', value: 30 },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                      >
                        <Cell fill="#8B5CF6" />
                        <Cell fill="#06B6D4" />
                        <Cell fill="#FBBF24" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex justify-center mt-4 space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-sm">Alpha</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></div>
                  <span className="text-sm">Beta</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm">Delta</span>
                </div>
              </div>
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
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-4`}>
                    {customer.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{customer.spent}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center">
                  <Image 
                    src={product.image} 
                    alt={product.name} 
                    width={40} // Specify the width
                    height={40} // Specify the height
                    className="rounded mr-4" 
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.amount}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{product.unitsSold} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Income Over Time</CardTitle>
            <div className="flex items-center text-sm text-gray-500">
              Last 12 Hours <ChevronDown className="ml-1 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between">
              <div>
                <h4 className="text-2xl font-bold">645</h4>
                <p className="text-sm text-gray-500">Orders on May 22</p>
              </div>
              <div>
                <h4 className="text-2xl font-bold">472</h4>
                <p className="text-sm text-gray-500">Orders on May 21</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incomeOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="May21" stroke="#8884d8" />
                <Line type="monotone" dataKey="May22" stroke="#82ca9d" />
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
              <h4 className="text-2xl font-bold">{formatNumber(1259)}</h4>
              <p className="text-sm text-gray-500">Items Sold</p>
              <h4 className="text-2xl font-bold mt-2">{formatNumber(2000000)} XAF</h4>
              <p className="text-sm text-gray-500">Revenue</p>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={last7DaysSalesData}>
                <Bar dataKey="sales" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}