"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ChevronLeft, Plus, Trash2 } from "lucide-react"
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
  productId: string;
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
  price: number;
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
  order?: {
    id: string;
    items: OrderItem[];
    total: number;
    status: string;
  };
  message?: string;
}

interface AddOrderProps {
  onBack: () => void;
}

export function AddOrder({ onBack }: AddOrderProps) {
  const { user, business } = useAuthLayout();
  const shop_id = localStorage.getItem('currentShopId');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [deliveryStatus, setDeliveryStatus] = useState<'pending' | 'delivered'>('pending')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money' | 'bank_transfer'>('cash')
  const [discount, setDiscount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await safeIpcInvoke<CustomerResponse>('entities:customer:get-all', {
        shop_id: shop_id
      }, {
        success: false,
        customers: []
      });

      if (response?.success && response.customers) {
        setCustomers(response.customers);
      } else {
        toast({
          title: "Error",
          description: "Failed to load customers",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
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
      ?.filter((shop: any) => shop?.dataValues?.id)
      .map((shop: any) => shop.dataValues.id) || [];

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

  const handleAddItem = () => {
    if (selectedProduct) {
      const newItem: OrderItem = {
        id: Date.now().toString(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        unitPrice: selectedProduct.price,
        quantity: quantity,
        total: selectedProduct.price * quantity
      }
      setOrderItems([...orderItems, newItem])
      setSelectedProduct(null)
      setSearchTerm("")
      setQuantity(1)
    }
  }

  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      const result = await safeIpcInvoke<OrderResponse>('order-management:create-sale', {
        orderItems,
        customer,
        paymentMethod,
        deliveryStatus,
        amountPaid: totalOrderAmount - discount,
        changeGiven: 0,
        shopId: shop_id,
        created_by: user?.id,
        employee_name: user?.username,
        discount,
        deliveryFee: 0
      }, { success: false });

      if (result?.success && result.order) {
        toast({
          title: "Success",
          description: "Order created successfully",
        });
        onBack(); // Return to order list
      } else {
        toast({
          title: "Error",
          description: "Failed to create order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    }
  }

  const totalOrderAmount = orderItems.reduce((sum, item) => sum + item.total, 0)

  const filteredProducts = searchTerm
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        p.status !== 'out_of_stock'
      )
    : [];

  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back to Orders
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
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute mt-1 w-full max-h-60 overflow-auto bg-white border rounded-md shadow-lg z-10">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(product);
                          setSearchTerm(product.name);
                        }}
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">
                          Price: {product.price} XAF | Stock: {product.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <Button onClick={handleAddItem} disabled={!selectedProduct}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
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
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={orderItems.length === 0 || !selectedCustomer}
            >
              Save Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}