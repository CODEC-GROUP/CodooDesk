'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { MoreHorizontal, ListFilter, PlusCircle, Store } from "lucide-react"
import { formatCurrency } from '@/lib/utils'

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
import { safeIpcInvoke } from '@/lib/ipc'
import { SalesAttributes } from "@/models/Sales"
import { EmptyState } from '../Empty/EmptyState'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { toast } from '@/hooks/use-toast'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem
} from "@/components/ui/command"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Label } from "@/components/Shared/ui/label"

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

// Non-hook version of formatCurrency for export functionality
const formatCurrencyForExport = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export function OrderList({ onOrderClick, onAddOrder }: OrderListProps) {
  const { user, business, availableShops } = useAuthLayout();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValue, setFilterValue] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
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

    // Determine shop IDs based on selection and role
    let requestShopId = null;
    let requestShopIds = null;

    if (shopId) {
      // If specific shop is selected, use that
      requestShopId = shopId;
    } else if (user.role === 'admin' || user.role === 'shop_owner') {
      // For admin/owner without specific shop selected, use all available shop IDs
      requestShopIds = business.shops?.map(shop => shop.id);
    } else {
      // For regular employees, use their assigned shop
      requestShopId = availableShops?.[0]?.id;
    }

    // Validate shop ID requirement
    if (!requestShopId && (!requestShopIds || requestShopIds.length === 0)) {
      console.error('No shop IDs available');
      toast({
        title: "Error",
        description: "No shops available - configure shops first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const params = {
        user,
        shopId: requestShopId,
        shopIds: requestShopIds,
        page: currentPage,
        limit: itemsPerPage,
        status: filterValue !== 'all' ? filterValue : undefined,
        search: searchTerm.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      console.log('Making IPC call with:', params);

      const result = await safeIpcInvoke<{
        success: boolean;
        sales: Sale[];
        total: number;
        currentPage: number;
        pages: number;
        message?: string;
      }>('order-management:get-sales', params);

      console.log('IPC call result:', result);

      if (result?.success) {
        setSales(result.sales);
        setFilteredSales(result.sales);
      } else {
        setSales([]);
        setFilteredSales([]);
        toast({
          title: "Error",
          description: result?.message || "Failed to fetch orders",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSales([]);
      setFilteredSales([]);
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
    if (business?.id && user?.id) {
      fetchSales();
    }
  }, [business, user, shopId, currentPage, itemsPerPage, filterValue, searchTerm, startDate, endDate]);

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
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageItems = filteredSales.slice(startIndex, endIndex);

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

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // Check if sales data exists
      if (!sales || sales.length === 0) {
        toast({
          title: "Export Failed",
          description: "No data available to export",
          variant: "destructive",
        });
        return;
      }

      const currentShopId = shopId || business?.shops?.[0]?.id;
      const currentShop = business?.shops?.find(shop => shop.id === currentShopId);
      const shopName = currentShop?.name?.replace(/[^a-z0-9]/gi, '_') || 'Shop'; // Sanitize filename
      const dateString = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

      // Common data preparation
      const headers = ['Order ID', 'Customer', 'Date', 'Status', 'Amount', 'Payment'];
      const data = sales.map(sale => ([
        sale.id?.slice(0, 8) ?? '', // Truncated ID
        sale.customer?.name ?? 'Walking Customer',
        sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A',
        sale.deliveryStatus ?? 'N/A',
        formatCurrencyForExport(sale.netAmount),
        sale.paymentStatus ?? 'N/A'
      ])) as RowInput[];

      if (format === 'csv' || format === 'excel') {
        const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const fileExtension = format === 'csv' ? 'csv' : 'xlsx';
        
        // Create CSV content with proper escaping
        const csvContent = [headers, ...data]
          .map(row => {
            if (Array.isArray(row)) {
              return row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"')) {
                  return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
              }).join(',');
            }
            return '';
          })
          .join('\n');
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shopName}_Orders_${dateString}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: `${format.toUpperCase()} file has been generated`,
          variant: "default",
        });
      }

      if (format === 'pdf') {
        try {
          // Create PDF document
          const doc = new jsPDF('l', 'mm', 'a4');
          doc.setFont('helvetica', 'normal');
          
          // Title Section
          doc.setFontSize(18);
          doc.text(`${shopName} - Orders Report`, 14, 20);
          doc.setFontSize(10);
          doc.setTextColor(100);
          
          // Shop Info
          if (currentShop) {
            doc.text(`Shop: ${currentShop.name}`, 14, 28);
            currentShop.address && doc.text(`Address: ${currentShop.address}`, 14, 33);
          }
          
          // Table
          autoTable(doc, {
            head: [headers.map(h => h.toUpperCase())],
            body: data,
            startY: currentShop ? 40 : 25,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [55, 65, 81], textColor: 255 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { horizontal: 14 },
          });

          // Footer
          const pageCount = (doc as any).getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
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

          // Save the PDF
          doc.save(`${shopName}_Orders_${dateString}.pdf`);
          
          toast({
            title: "Export Successful",
            description: "PDF report generated with order details",
            variant: "default",
          });
        } catch (pdfError) {
          console.error('PDF Generation Error:', pdfError);
          toast({
            title: "PDF Error",
            description: "Failed to generate PDF document",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Export Failed:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate export file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOrderClick = (orderId: string) => {
    onOrderClick(orderId);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
          {/* Header Section */}
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
              <Button onClick={() => onAddOrder?.()}>
                + New Order
              </Button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-[180px]">
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4" />
                    <SelectValue placeholder="Filter Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filters */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              <div className="flex flex-col">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>
            </div>

            {(user?.role === 'admin' || user?.role === 'shop_owner') && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px] justify-start">
                    <Store className="mr-2 h-4 w-4" />
                    {shopId ? business?.shops?.find(s => s.id === shopId)?.name : "All Shops"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0">
                  <Command>
                    <CommandInput placeholder="Filter shops..." />
                    <CommandList>
                      <CommandGroup>
                        {business?.shops?.map((shop: any) => (
                          <CommandItem
                            key={shop.id}
                            value={shop.id}
                            onSelect={() => setShopId(shop.id === shopId ? null : shop.id)}
                          >
                            <Checkbox
                              checked={shopId === shop.id}
                              className="mr-2"
                            />
                            {shop.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Table Container */}
          <Card>
            <CardContent className="p-6">
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
                        <TableCell>
                          <span className="font-mono text-sm">
                            {sale.id ? `${sale.id.slice(0, 6)}...` : 'N/A'}
                          </span>
                        </TableCell>
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
            </CardContent>
          </Card>

          {/* Pagination - Outside Card */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredSales.length)} of {filteredSales.length} orders
              </span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
