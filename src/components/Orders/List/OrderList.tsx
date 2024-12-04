'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Shared/ui/select"
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
  onOrderClick: (order: SalesAttributes) => void;
  onAddOrder: () => void;
}

export function OrderList({ onOrderClick, onAddOrder }: OrderListProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filterValue, setFilterValue] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSales = async (page: number) => {
    try {
      const result = await safeIpcInvoke('order-management:get-sales', {
        shopId: 'your-shop-id',
        page,
        limit: 10,
        status: filterValue !== 'all' ? filterValue : undefined
      }, { success: false, sales: [], pages: 0 });

      setSales(result?.success ? result.sales : []);
      setTotalPages(result?.pages || 0);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSales([]);
      setTotalPages(0);
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

  useEffect(() => {
    fetchSales(currentPage);
  }, [currentPage, filterValue]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      {sales.length === 0 && !loading ? (
        <EmptyState onStartSelling={() => {}} />
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Orders</h1>
                <Button onClick={onAddOrder}>
                  + New Order
                </Button>
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
                      <TableRow key={sale.id}>
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
                            variant="outline"
                            size="sm"
                            onClick={() => onOrderClick(sale)}
                          >
                            View Details
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
