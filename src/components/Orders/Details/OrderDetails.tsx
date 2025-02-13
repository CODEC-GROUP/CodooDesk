'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import { ChevronLeft, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/Shared/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Shared/ui/select"
import { safeIpcInvoke } from '@/lib/ipc'
import { toast } from '@/hooks/use-toast'
import { PrinterService, PrinterBusinessInfo, PrinterReceiptData } from "@/services/printerService"
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { SalesAttributes } from "@/models/Sales"

interface IpcResponse {
  success: boolean;
  sale?: SalesAttributes;
  message?: string;
  data?: {
    receiptData: PrinterReceiptData;
  };
}

interface SaleResponse {
  sale: SalesAttributes;
  receiptData: ReceiptData;
}

interface ReceiptData {
  saleId: string;
  receiptId: string | null;
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    sellingPrice: number;
  }>;
  subtotal: number;
  discount: number;
  deliveryFee?: number;
  total: number;
  amountPaid: number;
  change: number;
  date: string;
  paymentMethod: string;
  salesPersonId: string;
}

interface OrderDetailsProps {
  orderId: string;
  onBack: () => void;
}

const OrderDetails = ({ orderId, onBack }: OrderDetailsProps) => {
  const { user, business, availableShops } = useAuthLayout();
  const [order, setOrder] = useState<SalesAttributes | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasPrinter, setHasPrinter] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        console.log('Fetching order details for ID:', orderId);
        const result = await safeIpcInvoke<IpcResponse>('order-management:get-sale-details', { id: orderId });
        
        console.log('Order details result:', result);
        
        if (!result?.success || !result?.sale) {
          throw new Error(result?.message || "Failed to fetch order details");
        }

        setOrder(result.sale);
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch order details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId]);

  const handleUpdateStatus = async (type: 'delivery' | 'payment', status: string) => {
    try {
      setIsUpdating(true);
      const result = await safeIpcInvoke<IpcResponse>('order-management:update-sale-status', {
        saleId: order?.id,
        type,
        status
      });

      if (!result?.success) {
        throw new Error(result?.message || `Failed to update ${type} status`);
      }

      if (result.sale) {
        setOrder(result.sale);
      }

      if (result.data?.receiptData) {
        setReceiptData(result.data.receiptData as unknown as ReceiptData);
      }

      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    } catch (error) {
      console.error(`Error updating ${type} status:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to update ${type} status`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = async () => {
    if (!order || !business) {
      toast({
        title: "Error",
        description: "Order details or business information not available",
        variant: "destructive",
      });
      return;
    }

    const currentShopId = (user?.role === 'admin' || user?.role === 'shop_owner')
      ? business?.shops?.[0]?.id
      : availableShops?.[0]?.id;

    const currentShop = (user?.role === 'admin' || user?.role === 'shop_owner')
      ? business.shops?.find(shop => shop.id === currentShopId)
      : availableShops?.[0];

    if (!currentShop) {
      toast({
        title: "Error",
        description: "Shop information not found",
        variant: "destructive",
      });
      return;
    }

    const businessInfo: PrinterBusinessInfo = {
      fullBusinessName: business.fullBusinessName,
      shopLogo: business.shopLogo,
      address: business.address,
      shop: {
        id: currentShop.id,
        name: currentShop.name
      }
    };

    try {
      const result = await safeIpcInvoke<IpcResponse>('order-management:get-sale-details', { id: order?.id });
      
      if (!result?.success || !result?.data?.receiptData) {
        throw new Error("Failed to get receipt data");
      }

      const receiptData: PrinterReceiptData = {
        ...result.data.receiptData,
        salesPersonId: user?.id ?? '',
        salesPersonName: user?.username ?? 'Unknown'
      };

      const printerService = new PrinterService();
      await printerService.printReceipt(businessInfo, receiptData);
    } catch (error) {
      console.error('Error showing print preview:', error);
      toast({
        title: "Error",
        description: "Failed to show print preview",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid':
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'shipped':
        return 'bg-blue-100 text-blue-800'
      case 'partially_paid':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading || !order) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <h2 className="text-2xl font-bold">Order Details</h2>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Order ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{order.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Customer</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {order.customer?.first_name || 'Walk-in Customer'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{order.paymentMethod}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Delivery Status</label>
                <div className="mt-1 flex items-center space-x-4">
                  <Badge variant="outline" className={getStatusColor(order.deliveryStatus)}>
                    {order.deliveryStatus}
                  </Badge>
                  <Select
                    value={order.deliveryStatus}
                    onValueChange={(value) => handleUpdateStatus('delivery', value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Payment Status</label>
                <div className="mt-1 flex items-center space-x-4">
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleUpdateStatus('payment', value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.orders?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {(item.sellingPrice || 0).toLocaleString()} FCFA
                  </TableCell>
                  <TableCell className="text-right">
                    {((item.quantity || 0) * (item.sellingPrice || 0)).toLocaleString()} FCFA
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right font-bold">
                  {order.netAmount.toLocaleString()} FCFA
                </TableCell>
              </TableRow>
              <TableRow>
                {/* <TableCell colSpan={3} className="text-right font-medium">
                  Tax
                </TableCell>
                <TableCell className="text-right font-bold">
                  {order.tax.toLocaleString()} FCFA
                </TableCell> */}
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Total
                </TableCell>
                <TableCell className="text-right font-bold">
                  {order.netAmount.toLocaleString()} FCFA
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderDetails;