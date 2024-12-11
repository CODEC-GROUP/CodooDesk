"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ChevronLeft, Plus, Trash2 } from "lucide-react"
import { PrinterService, PrinterBusinessInfo, PrinterReceiptData } from "@/services/printerService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/Shared/ui/select"
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  sku: string;
  status?: string;
}

interface CustomerResponse {
  success: boolean;
  customers?: Customer[];
  message?: string;
}

interface ProductResponse {
  success: boolean;
  products?: Product[];
  message?: string;
}

interface OrderResponse {
  success: boolean;
  sale: {
    id: string;
    shopId: string;
    status: 'completed' | 'pending' | 'cancelled';
    customer_id: string | null;
    deliveryStatus: 'pending' | 'shipped' | 'delivered';
    netAmount: number;
    amountPaid: number;
    changeGiven: number;
    deliveryFee: number;
    discount: number;
    profit: number;
    paymentMethod: 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
    salesPersonId: string;
    orders?: OrderItem[];
  };
  document?: {
    type: string;
    id: string;
    saleId: string;
    date: Date;
    items: OrderItem[];
    customerName: string;
    customerPhone: string;
    subtotal: number;
    discount: number;
    deliveryFee: number;
    total: number;
    paymentMethod: string;
    salesPersonId: string;
  };
  message?: string;
}

interface PrinterResponse {
  success: boolean;
  error?: string;
}

interface AddOrderProps {
  onBack: () => void;
}

export function AddOrder({ onBack }: AddOrderProps) {
  const { user, business } = useAuthLayout();
  const [shopId, setShopId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [deliveryStatus, setDeliveryStatus] = useState<'pending' | 'delivered'>('pending')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money' | 'bank_transfer'>('cash')
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending')
  const [discount, setDiscount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [manualProductName, setManualProductName] = useState("")
  const [manualProductPrice, setManualProductPrice] = useState<number>(0)
  const [hasPrinter, setHasPrinter] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [lastOrderResponse, setLastOrderResponse] = useState<OrderResponse | null>(null);
  const [tempQuantity, setTempQuantity] = useState<number>(1);

  // Add default walk-in customer
  const defaultCustomer: Customer = {
    id: 'walk-in',
    name: 'Walk-in Customer',
    email: '',
    phone: ''
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    checkPrinter();
  }, []);

  const fetchCustomers = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    const currentShopId = shopId || business?.shops?.[0]?.id;
    if (!currentShopId) {
      toast({
        title: "Error",
        description: "No shop selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await safeIpcInvoke<CustomerResponse>('entities:customer:get-all', {
        shopId: currentShopId
      });

      if (response?.success && response?.customers) {
        // Add walk-in customer at the beginning of the list
        setCustomers([defaultCustomer, ...response.customers]);
        // Set walk-in customer as default
        setSelectedCustomer(defaultCustomer.id);
      } else {
        toast({
          title: "Error fetching customers",
          description: response?.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const shopIds = business?.shops
        ?.filter((shop: any) => shop?.id)
        .map((shop: any) => shop.id) || [];

      const response = await safeIpcInvoke<ProductResponse>('inventory:product:get-all', {
        shopIds,
        businessId: business?.id
      }, {
        success: false,
        products: []
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch products');
      }

      setProducts(response.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkPrinter = async () => {
    const printerService = new PrinterService();
    const printerAvailable = await printerService.detectPrinter();
    setHasPrinter(printerAvailable);
  };

  const handleAddItem = () => {
    if (selectedProduct) {
      const newItem: OrderItem = {
        id: Date.now().toString(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        unitPrice: selectedProduct.sellingPrice,
        quantity: quantity,
        total: selectedProduct.sellingPrice * quantity
      }
      setOrderItems([...orderItems, newItem])
      setSelectedProduct(null)
      setSearchTerm("")
      setQuantity(1)
      // Form stays open
    }
  }

  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id))
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const customer = customers.find(c => c.id === selectedCustomer);

      const orderData = {
        orderItems: orderItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          sellingPrice: item.unitPrice
        })),
        customer: selectedCustomer === 'walk-in' ? null : customer,
        paymentMethod,
        paymentStatus,
        deliveryStatus,
        amountPaid: calculateTotal(),
        changeGiven: 0,
        shopId: shopId || business?.shops?.[0]?.id,
        discount,
        salesPersonId: user?.id
      };

      const response = await safeIpcInvoke<OrderResponse>(
        paymentStatus === 'paid' ? 'pos:sale:create' : 'order-management:create-sale',
        orderData
      );

      if (response?.success) {
        setLastOrderResponse(response);
        toast({
          title: "Success",
          description: `Order ${paymentStatus === 'paid' ? 'receipt' : 'invoice'} created successfully`,
        });
        // Don't call onBack() here to keep the form open
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to create order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handlePrint = async () => {
    if (!lastOrderResponse || !business) {
      toast({
        title: "Error",
        description: "Order details or business information not available",
        variant: "destructive",
      });
      return;
    }

    const currentShopId = shopId || business?.shops?.[0]?.id;
    const currentShop = business.shops?.find(shop => shop.id === currentShopId);

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

    const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

    const receiptData: PrinterReceiptData = {
      saleId: lastOrderResponse.sale.id,
      receiptId: lastOrderResponse.sale.id,
      customerName: selectedCustomerData?.name,
      customerPhone: selectedCustomerData?.phone,
      customerEmail: selectedCustomerData?.email,
      items: orderItems.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        sellingPrice: item.unitPrice
      })),
      subtotal: totalOrderAmount,
      discount,
      total: calculateTotal(),
      amountPaid: calculateTotal(),
      change: 0,
      date: new Date(),
      paymentMethod,
      salesPersonId: user?.id || '',
      salesPersonName: user?.username || '',
      paymentStatus: calculateTotal() === 0 ? "paid" : calculateTotal() > 0 ? "partially_paid" : "unpaid"
    };

    try {
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

  const calculateTotal = () => {
    const total = orderItems.reduce((sum, item) => sum + item.total, 0);
    return total - discount;
  }

  const totalOrderAmount = orderItems.reduce((sum, item) => sum + item.total, 0)

  const filteredProducts = searchTerm
    ? products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      p.status !== 'out_of_stock'
    )
    : [];

  const addManualProduct = () => {
    if (!manualProductName || manualProductPrice <= 0 || quantity <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter product name, valid price and quantity",
        variant: "destructive",
      })
      return
    }

    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      productName: manualProductName,
      unitPrice: manualProductPrice,
      quantity: quantity,
      total: manualProductPrice * quantity
    }

    setOrderItems([...orderItems, newItem])
    setManualProductName("")
    setManualProductPrice(0)
    setQuantity(1)
  }

  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Close
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer</label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Search and Add */}
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute mt-1 w-full max-h-60 overflow-auto bg-white border rounded-md shadow-lg z-10">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          if (tempQuantity > product.quantity) {
                            toast({
                              title: "Error",
                              description: "Quantity exceeds available stock",
                              variant: "destructive",
                            });
                            return;
                          }
                          const newItem: OrderItem = {
                            id: Date.now().toString(),
                            productId: product.id,
                            productName: product.name,
                            unitPrice: product.sellingPrice,
                            quantity: tempQuantity,
                            total: product.sellingPrice * tempQuantity
                          };
                          setOrderItems([...orderItems, newItem]);
                          setSearchTerm("");
                          setSelectedProduct(null);
                          setTempQuantity(1);
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-600">
                              Price: {product.sellingPrice} XAF | Stock: {product.quantity}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max={product.quantity}
                              value={tempQuantity}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value > 0 && value <= product.quantity) {
                                  setTempQuantity(value);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-20"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <Input
                  placeholder="Manual Product Name"
                  value={manualProductName}
                  onChange={(e) => setManualProductName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={manualProductPrice || ""}
                  onChange={(e) => setManualProductPrice(Number(e.target.value))}
                  className="w-32"
                />
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-32"
                />
                <Button onClick={addManualProduct}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Unit Price</th>
                  <th className="px-4 py-2 text-right">Quantity</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orderItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">{item.productName}</td>
                    <td className="px-4 py-2 text-right">{item.unitPrice} XAF</td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">{item.total} XAF</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td colSpan={3} className="px-4 py-2 text-right">Total Amount:</td>
                  <td className="px-4 py-2 text-right">{totalOrderAmount} XAF</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={paymentMethod}
                onValueChange={(value: 'cash' | 'card' | 'mobile_money' | 'bank_transfer') => setPaymentMethod(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Status</label>
              <Select
                value={paymentStatus}
                onValueChange={(value: 'paid' | 'pending') => setPaymentStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Status</label>
              <Select
                value={deliveryStatus}
                onValueChange={(value: 'pending' | 'delivered') => setDeliveryStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onBack}>Close</Button>
            {lastOrderResponse && (
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={isLoading}
              >
                {paymentStatus === 'paid' ? 'Print Receipt' : 'Print Invoice'}
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={orderItems.length === 0 || !selectedCustomer || isLoading}
            >
              {isLoading ? 'Processing...' : 'Save Order'}
            </Button>
          </div>
          
          {showPreview && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    {paymentStatus === 'paid' ? 'Receipt Preview' : 'Invoice Preview'}
                  </h3>
                  <Button variant="ghost" onClick={() => setShowPreview(false)}>
                    Close
                  </Button>
                </div>
                <div 
                  className="print-preview" 
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}