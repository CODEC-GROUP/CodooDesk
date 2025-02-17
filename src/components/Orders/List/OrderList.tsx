'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {  RowInput } from 'jspdf-autotable';
import UserConfig from 'jspdf-autotable';
import { MoreHorizontal } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Shared/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/Shared/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Search } from 'lucide-react'
import Pagination from "@/components/Shared/ui/pagination"
import { formatCurrency } from '@/lib/utils'
import { safeIpcInvoke } from '@/lib/ipc'
import { SalesAttributes } from "@/models/Sales"
import { EmptyState } from '../Empty/EmptyState'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { toast } from '@/hooks/use-toast'

type Sale = SalesAttributes & {
  customer?: {
    id: string;
    name: string;
  } | null;
  orders?: Array<{
    id: string;
    quantity: number;
    product: {
      name: string;
      price: number;
    };
  }>;
  paymentStatus: 'paid' | 'pending';
};

interface OrderListProps {
  onOrderClick: (orderId: string) => void;
  onAddOrder: () => void;
}

interface SaleResponse {
  success: boolean;
  sale?: SalesAttributes;
  message?: string;
}

export function OrderList({ onOrderClick, onAddOrder }: OrderListProps) {
  const { user, business, availableShops } = useAuthLayout();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValue, setFilterValue] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);
  
  const ITEMS_PER_PAGE = 10;

  // Improved shop ID handling
  const shopIds = useMemo(() => {
    return (user?.role === 'admin' || user?.role === 'shop_owner')
      ? business?.shops?.map(shop => shop.id) || []
      : [availableShops?.[0]?.id].filter(Boolean) as string[];
  }, [user, business, availableShops]);

  const fetchSales = async () => {
    console.log('Starting fetchSales...');
    
    // Add business check first
    if (!business?.id) {
      console.error('No business configured');
      toast({
        title: "Error",
        description: "Business configuration not loaded",
        variant: "destructive",
      });
      return;
    }

    // Improved user check
    if (!user?.id) {
      console.error('No user found');
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Handle empty shop IDs
    if (shopIds.length === 0) {
      console.error('No shop IDs available');
      toast({
        title: "Error",
        description: "No shops available - configure shops first",
        variant: "destructive",
      });
      return;
    }

    const currentShopId = shopId || shopIds[0];
    
    try {
      console.log('Making IPC call with:', {
        user,
        shopId: currentShopId,
        page: 1,
        limit: 10,
        status: filterValue !== 'all' ? filterValue : undefined,
        search: searchTerm.trim() || undefined
      });

      const result = await safeIpcInvoke('order-management:get-sales', {
        user,
        shopId: currentShopId,
        page: 1,
        limit: 10,
        status: filterValue !== 'all' ? filterValue : undefined,
        search: searchTerm.trim() || undefined
      }, { success: false, sales: [], pages: 0 });

      console.log('IPC call result:', result);

      setSales(result?.success ? result.sales : []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSales([]);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business?.id && user?.id && shopIds.length > 0) {
      fetchSales();
    }
  }, [business, user, shopIds]); // Added shopIds to dependencies

  useEffect(() => {
    let result = [...sales];

    if (filterValue !== 'all') {
      result = result.filter(sale => sale.deliveryStatus === filterValue);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(sale => 
        sale.id?.toLowerCase().includes(searchLower) ||
        sale.customer?.name?.toLowerCase().includes(searchLower) ||
        sale.deliveryStatus.toLowerCase().includes(searchLower) ||
        formatCurrency(sale.netAmount).toLowerCase().includes(searchLower)
      );
    }

    setFilteredSales(result);
    setCurrentPage(1);
  }, [sales, filterValue, searchTerm]);

  const totalFilteredItems = filteredSales.length;
  const totalPages = Math.ceil(totalFilteredItems / ITEMS_PER_PAGE);
  const currentPageItems = filteredSales.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewDetails = async (saleId: string) => {
    if (!saleId) {
      console.error('No sale ID provided');
      return;
    }

    try {
      const result = await safeIpcInvoke<SaleResponse>('order-management:get-sale-details', {
        id: saleId,
        user,
        shopId: shopId || business?.shops?.[0]?.id,
      });

      if (result?.success && result?.sale) {
        onOrderClick(saleId);
      } else {
        toast({
          title: "Error",
          description: result?.message || "Failed to fetch order details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive",
      });
    }
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    // Get current shop name
    const currentShopId = shopId || business?.shops?.[0]?.id;
    const currentShop = business?.shops?.find(shop => shop.id === currentShopId);
    const shopName = currentShop?.name || 'Shop';

    const headers = ['Order ID', 'Customer', 'Date', 'Status', 'Amount', 'Payment'];
    const data = sales.map(sale => ([
      sale.id ?? '',
      sale.customer?.name ?? 'Walking Customer',
      sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A',
      sale.deliveryStatus ?? 'N/A',
      formatCurrency(sale.netAmount),
      sale.paymentStatus ?? 'N/A'
    ])) as string[][];

    if (format === 'csv' || format === 'excel') {
      const csvContent = [headers, ...data].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${shopName}-orders-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xls'}`;
      a.click();
    } else if (format === 'pdf') {
      try {
        const doc = new jsPDF();
        
        // Add title with shop name
        const title = `${shopName} - Orders Report - ${new Date().toLocaleDateString()}`;
        doc.setFontSize(16);
        doc.text(title, 14, 15);
        
        // Add shop info if available
        if (currentShop?.name) {
          doc.setFontSize(12);
          doc.text(currentShop.name, 14, 25);
        }

        // Configure the table
        autoTable(doc, {
          head: [headers],
          body: data,
          startY: currentShop?.name ? 30 : 25,
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [66, 66, 66],
            textColor: [250, 250, 250],
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          margin: { top: 30 },
        });
        
        // Add footer with timestamp
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.text(
            `Generated on ${new Date().toLocaleString()}`,
            14,
            doc.internal.pageSize.height - 10
          );
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.width - 25,
            doc.internal.pageSize.height - 10
          );
        }
        
        // Save with shop name in filename
        doc.save(`${shopName}-orders-${new Date().toISOString().split('T')[0]}.pdf`);
        
        toast({
          title: "Success",
          description: "PDF has been generated successfully",
          variant: "default",
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: "Error",
          description: "Failed to generate PDF",
          variant: "destructive",
        });
      }
    }
  };

  const handleOrderClick = (orderId: string) => {
    onOrderClick(orderId);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      {sales.length === 0 && !loading ? (
        <EmptyState 
          type="order"
          onAddOrder={onAddOrder}
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Orders</h1>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('csv')}>
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('excel')}>
                        Export as Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={onAddOrder}>
                    + New Order
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <Select 
                  value={filterValue}
                  onValueChange={setFilterValue}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {(user?.role === 'admin' || user?.role === 'shop_owner') && (
                <div className="space-y-4">
                  <h3 className="font-medium">Filter by Shops</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Select Shop
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {shopIds.map((id) => (
                        <DropdownMenuItem key={id} onClick={() => setShopId(id)}>
                          {id}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPageItems.map((sale) => (
                      <TableRow 
                        key={sale.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={(e) => {
                          e.preventDefault();
                          if (sale.id) handleViewDetails(sale.id);
                        }}
                      >
                        <TableCell>{sale.id}</TableCell>
                        <TableCell>
                          {sale.customer?.name || 'Walking Customer'}
                        </TableCell>
                        <TableCell>
                          {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                            ${sale.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                              sale.deliveryStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'}`}>
                            {sale.deliveryStatus}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(sale.netAmount)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 
                              'bg-yellow-100 text-yellow-800'}`}>
                            {sale.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (sale.id) handleViewDetails(sale.id);
                            }}
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
