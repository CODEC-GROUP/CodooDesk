'use client'

import { useState, useEffect } from 'react'
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

export function OrderList({ onOrderClick, onAddOrder }: OrderListProps) {
  const { user, business } = useAuthLayout();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filterValue, setFilterValue] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);

  const fetchSales = async (page: number) => {
    console.log('Starting fetchSales...', { user, business });
    if (!user) {
      console.error('No user found');
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    const currentShopId = shopId || business?.shops?.[0]?.id;
    console.log('Current shop ID:', currentShopId);
    if (!currentShopId) {
      console.error('No shop ID found');
      toast({
        title: "Error",
        description: "No shop selected",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Making IPC call with:', {
        user,
        shopId: currentShopId,
        page,
        limit: 10,
        status: filterValue !== 'all' ? filterValue : undefined
      });

      const result = await safeIpcInvoke('order-management:get-sales', {
        user,
        shopId: currentShopId,
        page,
        limit: 10,
        status: filterValue !== 'all' ? filterValue : undefined
      }, { success: false, sales: [], pages: 0 });

      console.log('IPC call result:', result);

      setSales(result?.success ? result.sales : []);
      setTotalPages(result?.pages || 0);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSales([]);
      setTotalPages(0);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (saleId: string) => {
    try {
      const result = await safeIpcInvoke('order-management:get-sale-details', {
        saleId
      }, { success: false, sale: null });

      if (result?.success) {
        console.log(result.sale);
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
    }
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const headers = ['Order ID', 'Customer', 'Date', 'Status', 'Amount', 'Payment'];
    const data = sales.map(sale => ([
      sale.id,
      sale.customer?.name || 'Walking Customer',
      sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A',
      sale.deliveryStatus,
      formatCurrency(sale.netAmount),
      sale.paymentStatus
    ]));

    if (format === 'csv') {
      const csvContent = [headers, ...data].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'excel') {
      const csvContent = [headers, ...data].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().split('T')[0]}.xls`;
      a.click();
    } else if (format === 'pdf') {
      try {
        const doc = new jsPDF();
        
        // Add title
        const title = `Orders Report - ${new Date().toLocaleDateString()}`;
        doc.setFontSize(16);
        doc.text(title, 14, 15);
        
        // Add business info if available
        if (business && 'fullBusinessName' in business) {
          doc.setFontSize(12);
          doc.text(business.fullBusinessName, 14, 25);
        }
        
        // Define headers with proper typing
        const headers = [
          { content: "Order ID" },
          { content: "Customer" },
          { content: "Date" },
          { content: "Status" },
          { content: "Amount" },
          { content: "Payment" },
        ];
        
        const body = sales.map((sale) => [
          { content: sale.id },
          { content: sale.customer?.name || "Walking Customer" },
          { content: sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : "N/A" },
          { content: sale.deliveryStatus },
          { content: formatCurrency(sale.netAmount) },
          { content: sale.paymentStatus },
        ]);
        
        
        // Define table data with proper typing

        autoTable(doc, {
          head: headers,
          body: body,
          startY: business?.fullBusinessName ? 30 : 25,
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
        
        // Save the PDF
        doc.save(`orders-${new Date().toISOString().split('T')[0]}.pdf`);
        
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

  useEffect(() => {
    console.log('useEffect triggered with:', { currentPage, filterValue });
    fetchSales(currentPage);
  }, [currentPage, filterValue, business, user]);

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
                    {sales.map((sale) => (
                      <TableRow 
                        key={sale.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => sale.id ? onOrderClick(sale.id) : null}
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
                        <TableCell>{formatCurrency(sale.netAmount).toLocaleString()} FCFA</TableCell>
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
                            onClick={() => sale.id ? onOrderClick(sale.id) : null}
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
