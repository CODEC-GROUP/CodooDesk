'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Package, ShoppingCart, DollarSign, AlertTriangle, ChevronDown } from 'lucide-react'
import Image from 'next/image'

const weeklyInventoryData = [
  { day: 'Mon', count: 320 },
  { day: 'Tue', count: 450 },
  { day: 'Wed', count: 380 },
  { day: 'Thu', count: 470 },
  { day: 'Fri', count: 540 },
  { day: 'Sat', count: 460 },
  { day: 'Sun', count: 400 },
]

const inventoryValueData = [
  { time: '4am', May21: 20000, May22: 10000 },
  { time: '5am', May21: 25000, May22: 15000 },
  { time: '6am', May21: 18000, May22: 25000 },
  { time: '7am', May21: 22000, May22: 30000 },
  { time: '8am', May21: 28000, May22: 35000 },
  { time: '9am', May21: 30000, May22: 40000 },
  { time: '10am', May21: 35000, May22: 45000 },
  { time: '11am', May21: 32000, May22: 50000 },
  { time: '12pm', May21: 28000, May22: 55000 },
  { time: '1pm', May21: 38000, May22: 45000 },
  { time: '2pm', May21: 42000, May22: 50000 },
  { time: '3pm', May21: 45000, May22: 60000 },
]

const last7DaysInventoryData = [
  { day: '12', count: 1000 },
  { day: '13', count: 1200 },
  { day: '14', count: 1100 },
  { day: '15', count: 1300 },
  { day: '16', count: 1400 },
  { day: '17', count: 1800 },
  { day: '18', count: 1600 },
]

const topSuppliers = [
  { name: 'Supplier A', items: 52, value: '21,765 XAF' },
  { name: 'Supplier B', items: 43, value: '18,900 XAF' },
  { name: 'Supplier C', items: 38, value: '15,600 XAF' },
  { name: 'Supplier D', items: 34, value: '14,200 XAF' },
]

const topProducts = [
  { name: 'Product X', amount: '11,456 XAF', inStock: 195, image: '/placeholder.svg?height=40&width=40' },
  { name: 'Product Y', amount: '9,456 XAF', inStock: 146, image: '/placeholder.svg?height=40&width=40' },
  { name: 'Product Z', amount: '8,456 XAF', inStock: 110, image: '/placeholder.svg?height=40&width=40' },
  { name: 'Product W', amount: '7,456 XAF', inStock: 87, image: '/placeholder.svg?height=40&width=40' },
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

export function InventoryDashboard() {
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <h3 className="text-2xl font-bold text-gray-700">{formatNumber(10000)}</h3>
              <p className="text-sm text-green-500">↑ 5%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-green-100 p-3 rounded-full">
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Items Sold</p>
              <h3 className="text-2xl font-bold text-gray-700">{formatNumber(1056)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <h3 className="text-2xl font-bold text-gray-700">48</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-purple-100 p-3 rounded-full">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inventory Value</p>
              <h3 className="text-2xl font-bold text-gray-700">{formatNumber(500000)} XAF</h3>
              <p className="text-sm text-green-500">↑ 8%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Inventory Trend</CardTitle>
            <div className="flex items-center text-sm text-gray-500">
              Last Week <ChevronDown className="ml-1 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyInventoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <div className="grid grid-rows-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Status</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <CircularProgressBar percentage={75} color="text-green-400" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>In Stock:</span>
                  <span className="font-medium">75%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Low Stock:</span>
                  <span className="font-medium">20%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Out of Stock:</span>
                  <span className="font-medium">5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Electronics', value: 40 },
                          { name: 'Clothing', value: 30 },
                          { name: 'Home', value: 30 },
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
                  <span className="text-sm">Electronics</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></div>
                  <span className="text-sm">Clothing</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm">Home</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSuppliers.map((supplier, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-4`}>
                    {supplier.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">{supplier.items} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{supplier.value}</p>
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
                  <Image src={product.image} alt={product.name} width={40} height={40} className="rounded mr-4" />
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.amount}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{product.inStock} in stock</p>
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
            <CardTitle>Inventory Value Over Time</CardTitle>
            <div className="flex items-center text-sm text-gray-500">
              Last 12 Hours <ChevronDown className="ml-1 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between">
              <div>
                <h4 className="text-2xl font-bold">{formatNumber(600000)} XAF</h4>
                <p className="text-sm text-gray-500">Value on May 22</p>
              </div>
              <div>
                <h4 className="text-2xl font-bold">{formatNumber(550000)} XAF</h4>
                <p className="text-sm text-gray-500">Value on May 21</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={inventoryValueData}>
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
            <CardTitle>Last 7 Days Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h4 className="text-2xl font-bold">{formatNumber(1259)}</h4>
              <p className="text-sm text-gray-500">Items Added</p>
              <h4 className="text-2xl font-bold mt-2">{formatNumber(2000000)} XAF</h4>
              <p className="text-sm text-gray-500">Value Added</p>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={last7DaysInventoryData}>
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}