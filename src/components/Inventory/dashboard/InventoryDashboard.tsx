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

interface DashboardStats {
  total_products: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  itemsSold: number;
  inventoryValue: number;
  inventoryValueChange: number;
  shop_stats: {
    [key: string]: {
      total_products: number;
      total_value: number;
      low_stock_items: number;
    }
  };
  category_composition: Array<{
    name: string;
    percentage: number;
    value: number;
    color: string;
  }>;
}

interface DashboardTrends {
  data: Array<{
    day: string;
    count: number;
  }>;
  topProducts: Array<{
    id: string;
    quantity: number;
    reorder_point: number;
    value: number;
    total_value: number;
    product: {
      name: string;
      featuredImage: string;
    };
  }>;
  topSuppliers: Array<{
    name: string;
    value: number;
    items: number;
    color: string;
  }>;
}

interface DashboardData {
  stats: DashboardStats;
  trends: DashboardTrends;
}

export function InventoryDashboard() {
  const { business, user, availableShops } = useAuthLayout();
  const { fetchInventoryDashboard } = useDashboard();

  const [selectedShopIds, setSelectedShopIds] = useState<string[]>(() => {
    if (user?.role !== 'admin' && user?.role !== 'shop_owner') {
      return availableShops?.[0]?.id ? [availableShops[0].id] : [];
    }
    return [];
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  const [currentView, setCurrentView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['inventory-dashboard', business?.id, selectedShopIds, dateRange, currentView],
    queryFn: async () => {
      if (!business?.id) {
        throw new Error('No business ID available');
      }

      const response = await safeIpcInvoke<{ success: boolean; data: DashboardData }>(
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

      if (!response?.success || !response.data) {
        throw new Error('Failed to load dashboard data');
      }

      return response.data;
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

  const { stats, trends } = dashboardData || { stats: {}, trends: {} };

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
                {stats?.total_products ?? '--'}
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
              <h3 className="text-2xl font-bold text-gray-700">
                {formatNumber(stats?.itemsSold ?? 0)}
              </h3>
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
              <h3 className="text-2xl font-bold text-gray-700">
                {stats?.low_stock_items ?? 0}
              </h3>
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
                {formatNumber(stats?.inventoryValue ?? 0)} FCFA
              </h3>
              <p className="text-sm text-green-500">
                ↑ {stats?.inventoryValueChange ?? 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Inventory Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                      data={stats?.category_composition || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                    >
                      {(stats?.category_composition || []).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex justify-center mt-4 space-x-4">
              {(stats?.category_composition || []).map((entry, index) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(trends?.topProducts || []).map((product) => (
                <div key={product.id} className="flex items-center">
                  {product.product.featuredImage ? (
                    <Image
                      src={product.product.featuredImage}
                      alt={product.product.name}
                      width={40}
                      height={40}
                      className="rounded mr-4"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-4">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{product.product.name}</h3>
                    <p className="text-sm text-gray-500">{formatNumber(product.total_value)} FCFA</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{product.quantity} in stock</p>
                    {product.quantity <= product.reorder_point && (
                      <p className="text-sm text-red-500">Low Stock</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(trends?.topSuppliers || []).map((supplier, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-4`} style={{ backgroundColor: supplier.color }}>
                    {supplier.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">{supplier.items} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatNumber(supplier.value)} FCFA</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}