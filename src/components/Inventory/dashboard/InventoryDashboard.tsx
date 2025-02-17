'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Package, ShoppingCart, DollarSign, AlertTriangle, ChevronDown, Store } from 'lucide-react'
import Image from 'next/image'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'
import { LoadingSpinner } from '@/components/Shared/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/Shared/ui/ErrorAlert'
import { useQuery } from '@tanstack/react-query'
import { FilterControls } from './FilterControls'
import { InventoryTrends } from './InventoryTrends'
import { InventoryDashboardData } from '@/types/inventory'
import { safeIpcInvoke } from '@/lib/ipc'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { DateRange } from "react-day-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"

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

const processPieData = (data: { name: string; value: number; color: string }[] | undefined) => {
  return data?.map(item => ({
    name: item.name,
    value: item.value,
    color: item.color || '#8884d8' // default color
  })) || [];
};

export function InventoryDashboard() {
  const { business, user, availableShops } = useAuthLayout();
  const { fetchInventoryDashboard } = useDashboard();

  const [selectedShopIds, setSelectedShopIds] = useState<string[]>(() => {
    if (user?.role !== 'admin' && user?.role !== 'shop_owner') {
      return business?.shops?.[0]?.id ? [business.shops[0].id] : []
    }
    return availableShops?.[0]?.id ? [availableShops[0].id] : []
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  const [currentView, setCurrentView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const { data: dashboardData, isLoading, error } = useQuery<InventoryDashboardData>({
    queryKey: ['inventory-dashboard', business?.id, selectedShopIds, dateRange, currentView],
    queryFn: async () => {
      if (!business?.id) {
        throw new Error('No business ID available');
      }
      
      const data = await safeIpcInvoke<InventoryDashboardData>(
        'dashboard:inventory:get',
        {
          businessId: business.id,
          shopIds: selectedShopIds,
          dateRange: dateRange ? {
            start: dateRange.from?.toISOString(),
            end: dateRange.to?.toISOString()
          } : undefined,
          view: currentView
        },
        null
      );

      if (!data) {
        throw new Error('Failed to load dashboard data');
      }
      return data;
    },
    enabled: !!business?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  });

  if (isLoading) return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <LoadingSpinner />
    </div>
  );

  if (error) return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <ErrorAlert message={error.message} />
    </div>
  );

  const {
    stats,
    weeklyInventory,
    inventoryValueOverTime,
    last7DaysInventory,
    topSuppliers = [],
    topProducts = [],
    categoryDistribution = [],
    trends
  } = dashboardData || {};

  const processChartData = (data: { day: string; count: number }[] | undefined) => {
    return data?.map(item => ({
      name: item.day,
      value: item.count,
    })) || [];
  };

  const inventoryValue = dashboardData?.stats?.inventoryValue 
    ? formatNumber(dashboardData.stats.inventoryValue) + ' XAF'
    : '--';

  const handleShopSelection = (shopId: string) => {
    setSelectedShopIds(prev => 
      prev.includes(shopId)
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId]
    );
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="mb-6 flex gap-4">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
        <Select
          value={currentView}
          onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setCurrentView(value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
        {(user?.role === 'admin' || user?.role === 'shop_owner') && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-start">
                <Store className="mr-2 h-4 w-4" />
                {selectedShopIds.length === 0 
                  ? "All Shops" 
                  : business?.shops
                      ?.filter(shop => selectedShopIds.includes(shop.id))
                      .map(shop => shop.name || 'Unnamed Shop')
                      .join(', ') || `${selectedShopIds.length} selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
              <Command>
                <CommandInput placeholder="Filter shops..." />
                <CommandList>
                  <CommandGroup>
                    {business?.shops?.map((shop) => (
                      <CommandItem
                        key={shop.id}
                        value={shop.id}
                        onSelect={() => handleShopSelection(shop.id)}
                      >
                        <Checkbox
                          checked={selectedShopIds.includes(shop.id)}
                          className="mr-2"
                        />
                        {shop.name || 'Unnamed Shop'}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <h3 className="text-2xl font-bold text-gray-700">
                {dashboardData?.stats?.total_products ?? '--'}
              </h3>
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
              <h3 className="text-2xl font-bold text-gray-700">{formatNumber(stats?.itemsSold ?? 0)}</h3>
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
              <h3 className="text-2xl font-bold text-gray-700">{stats?.lowStockItems ?? 0}</h3>
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
              <h3 className="text-2xl font-bold text-gray-700">
                {inventoryValue}
              </h3>
              <p className="text-sm text-green-500">↑ {stats?.inventoryValueChange ?? 0}%</p>
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
              <BarChart data={processChartData(dashboardData?.weeklyInventory)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                {processChartData(dashboardData?.weeklyInventory).length === 0 ? (
                  <Bar dataKey="count" fill="#e5e7eb" radius={[4, 4, 0, 0]}>
                    {Array(7).fill(0).map((_, index) => (
                      <Cell key={index} fill="#f3f4f6" />
                    ))}
                  </Bar>
                ) : (
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                )}
                {processChartData(dashboardData?.weeklyInventory).length === 0 && (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#6b7280"
                  >
                    No data available
                  </text>
                )}
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
                        data={processPieData(categoryDistribution)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                      >
                        {processPieData(categoryDistribution).length === 0 ? (
                          <Cell key="empty" fill="#e5e7eb" />
                        ) : (
                          processPieData(categoryDistribution).map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))
                        )}
                      </Pie>
                      {processPieData(categoryDistribution).length === 0 && (
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#6b7280"
                        >
                          No data
                        </text>
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex justify-center mt-4 space-x-4">
                {processPieData(categoryDistribution).map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-sm">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(topSuppliers || []).map((supplier, index) => (
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
                <h4 className="text-2xl font-bold">
                  {formatNumber(stats?.valueOnLatest ?? 0)} XAF
                </h4>
                <p className="text-sm text-gray-500">Value on {stats?.latestDate ?? 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-2xl font-bold">
                  {formatNumber(stats?.valueOnPrevious ?? 0)} XAF
                </h4>
                <p className="text-sm text-gray-500">Value on {stats?.previousDate ?? 'N/A'}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={inventoryValueOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="valueOnPrevious" stroke="#8884d8" />
                <Line type="monotone" dataKey="valueOnLatest" stroke="#82ca9d" />
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
              <h4 className="text-2xl font-bold">{formatNumber(stats?.itemsAdded ?? 0)}</h4>
              <p className="text-sm text-gray-500">Items Added</p>
              <h4 className="text-2xl font-bold mt-2">
                {formatNumber(stats?.valueAdded ?? 0)} XAF
              </h4>
              <p className="text-sm text-gray-500">Value Added</p>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={last7DaysInventory}>
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <InventoryTrends data={trends} />
      </div>
    </div>
  )
}