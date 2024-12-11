"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Minus, Plus, X, RefreshCcw, AlertCircle } from "lucide-react"
import Image from 'next/image'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { AddProduct } from "@/components/Products/Form/AddProduct"
import EmptyState from './Empty/EmptyState'
import { PrinterService } from "@/services/printerService";

// Define the Product interface
interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  featuredImage: string | null;
  status: 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock';
  quantity: number;
  category_id: string;
  category?: {
    id: string;
    name: string;
  };
}

// Define the CartItem interface (extends Product with quantity and inventory)
interface CartItem extends Product {
  quantity: number;
  actualPrice: number;
}

// Define the Inventory interface
interface Inventory {
  id: number;
  name: string;
}

// Define the Customer interface
interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

// Define the TreasuryAccount interface
interface TreasuryAccount {
  id: number;
  name: string;
  type: string;
  number: string;
  description?: string;
  openingBalance: number;
  recurringBalance: number;
}

// Define the Category interface
interface Category {
  id: string;
  name: string;
  image?: string;
  description?: string;
  itemCount?: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => (
  <Card
    className="w-full cursor-pointer hover:shadow-md transition-shadow"
    onClick={() => onAddToCart(product)}
  >
    <CardContent className="p-2 relative">
      <span className={`absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded-full 
        whitespace-nowrap z-10 shadow-sm
        ${product.status === 'high_stock' ? 'bg-green-100 text-green-800' :
          product.status === 'medium_stock' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'}`}
      >
        in stock
      </span>

      <div className="flex justify-center mb-2">
        <Image
          src={product.featuredImage || '/assets/images/box.png'}
          alt={product.name}
          className="w-full h-16 object-contain"
          width={64}
          height={64}
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 className="text-xs font-medium truncate">
          {product.name}
        </h3>
        <p className="text-xs font-semibold">
          {product.sellingPrice} XAF
        </p>
      </div>
    </CardContent>
  </Card>
)

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdatePrice
}) => (
  <div className="flex flex-col py-2 border-b">
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <h4 className="font-medium text-sm">{item.name}</h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={item.actualPrice}
            onChange={(e) => {
              const newPrice = parseFloat(e.target.value);
              if (!isNaN(newPrice) && newPrice >= 0) {
                onUpdatePrice(item.id, newPrice);
              }
            }}
            className="w-24 h-8 text-sm"
          />
          <span className="text-xs text-gray-500">XAF</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="h-7 w-7"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="h-7 w-7"
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          className="h-7 w-7 ml-1"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  </div>
)

export function Pos() {
  const { user, business } = useAuthLayout();
  const [shopId, setShopId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentType, setPaymentType] = useState("CASH")
  const [currentPage, setCurrentPage] = useState(1)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const itemsPerPage = 36
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // const [selectedAccount, setSelectedAccount] = useState<TreasuryAccount | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [lastReceiptData, setLastReceiptData] = useState<any>(null);
  const [showAddProductForm, setShowAddProductForm] = useState(false);

  const handleAddProduct = () => {
    setShowAddProductForm(true);
  };

  const handleCloseAddProductForm = () => {
    setShowAddProductForm(false);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const addToCart = (product: Product) => {
    if (product.quantity <= 0 || product.status === 'out_of_stock') {
      setAlertMessage("This product is out of stock.");
      return;
    }
    const existingItem = cartItems.find(item => item.id === product.id)
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setCartItems([...cartItems, {
        ...product,
        quantity: 1,
        actualPrice: product.sellingPrice
      }])
    }
  }

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCartItems(cartItems.filter(item => item.id !== id));
    } else {
      setCartItems(cartItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    const subtotal = cartItems.reduce((total, item) => total + item.actualPrice * item.quantity, 0);
    return subtotal - discount;
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePayment = async () => {
    try {
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
          description: "Shop information not found",
          variant: "destructive",
        });
        return;
      }

      const customer = selectedCustomer || {
        id: null,
        name: 'Walk-in Customer',
        phone: ''
      };

      const total = calculateTotal();

      const saleData = {
        shopId: business?.shops?.[0]?.id,
        customer: customer,
        cartItems: cartItems,
        subtotal: total,
        paymentMethod: paymentType,
        amountPaid: amountPaid,
        changeGiven: changeAmount,
        discount: discount,
        salesPersonId: user?.id || '',
        salesPersonName: user?.username || '',
        paymentStatus: amountPaid >= total ? "paid" : amountPaid > 0 ? "partially_paid" : "unpaid"
      };

      const response = await safeIpcInvoke<{
        success: boolean;
        message?: string;
        sale?: any;
        receipt?: {
          saleId: string;
          receiptId: string;
          date: Date;
          items: Array<{ name: string; quantity: number; sellingPrice: number; }>;
          customerName: string;
          customerPhone: string;
          subtotal: number;
          discount: number;
          total: number;
          amountPaid: number;
          change: number;
          paymentMethod: string;
          salesPersonId: string;
          salesPersonName: string;
        };
      }>('pos:sale:create', saleData);

      if (response?.success && response.sale && response.receipt) {
        setPaymentSuccess(true);
        setLastSaleData(response.sale);
        setLastReceiptData(response.receipt);

        // Try to print receipt automatically
        await handlePrintReceipt(response);

        clearCart();
        setAmountPaid(0);
        setChangeAmount(0);
        setSelectedCustomer(null);
        setDiscount(0);

        toast({
          title: "Success",
          description: "Payment processed successfully",
        });
      } else {
        setAlertMessage(response?.message || 'Payment failed');
        toast({
          title: "Error",
          description: response?.message || "Payment failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      setAlertMessage('An error occurred while processing payment');
      toast({
        title: "Error",
        description: "An error occurred while processing payment",
        variant: "destructive",
      });
    }
  };

  const handlePrintReceipt = async (saleResponse: any) => {
    if (!business || !user) {
      toast({
        title: "Error",
        description: "Business or user information not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const printerService = new PrinterService();
      
      const currentShopId = shopId || business.shops?.[0]?.id;
      const currentShop = business.shops?.find(shop => shop.id === currentShopId);

      if (!currentShop) {
        throw new Error('Shop information not found');
      }

      const businessInfo = {
        fullBusinessName: business.fullBusinessName,
        shopLogo: business.shopLogo,
        address: business.address,
        taxIdNumber: business.taxIdNumber,
        shop: {
          id: currentShop.id,
          name: currentShop.name
        }
      };

      try {
        await printerService.printReceipt(businessInfo, saleResponse.receipt);
      } catch (error) {
        console.error('Error showing print preview:', error);
        toast({
          title: "Error",
          description: "Failed to show print preview",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error preparing receipt:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to prepare receipt",
        variant: "destructive",
      });
    }
  };

  const clearCart = () => {
    setCartItems([])
    setPaymentSuccess(false)
    setPaymentType("CASH")
  }

  const updatePrice = (id: string, newPrice: number) => {
    setCartItems(cartItems.map(item =>
      item.id === id ? { ...item, actualPrice: newPrice } : item
    ));
  };

  useEffect(() => {
    setChangeAmount(amountPaid - calculateTotal());
  }, [amountPaid, cartItems]);

  useEffect(() => {
    const initializeData = async () => {
      if (!user) {
        return; // Wait for user to be loaded
      }

      try {
        setLoading(true);
        // Get shop IDs directly
        const shopIds = business?.shops
          ?.filter((shop: any) => shop?.id)
          .map((shop: any) => shop.id) || [];

        // Proceed with API call
        const response = await safeIpcInvoke<{ success: boolean; products: Product[]; message?: string }>('inventory:product:get-all', {
          shopIds,
          businessId: business?.id
        }, {
          success: false,
          products: [],
          message: ''
        });

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to fetch products');
        }

        setProducts(response.products || []);

        // Fetch categories
        const categoryResponse = await safeIpcInvoke<{ success: boolean; categories?: Category[] }>('inventory:category:get-all', {
          businessId: business?.id
        }, {
          success: false,
          categories: []
        });

        if (categoryResponse?.success && categoryResponse.categories) {
          setCategories(categoryResponse.categories);
        }

      } catch (error) {
        console.error('Error initializing data:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize product data');
        toast({
          title: "Error",
          description: "Failed to load products. Please try refreshing the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, shopId]);

  // ... existing code ...

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const currentShopId = business?.shops?.[0]?.id || localStorage.getItem('currentShopId');

        const response = await safeIpcInvoke('entities:customer:get-all', {
          userId: user?.id,
          role: user?.role,
          shopId: currentShopId
        }, {
          success: false,
          customers: []
        });

        if (response?.success) {
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
      }
    };

    fetchCustomers();
  }, [user?.id, user?.role, business?.id]);



  useEffect(() => {
    setShopId(localStorage.getItem('currentShopId'));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[450px]">
        <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[450px] text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Error Loading Products</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4 p-4 h-full">
        {/* Left Section - Product Catalog */}
        <div className="w-full md:w-2/3 bg-white rounded-lg shadow-sm p-4 flex flex-col h-full">
          {/* Alert Message */}
          {alertMessage && (
            <div className="flex items-center bg-red-100 text-red-800 p-2 rounded mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAlertMessage(null)}
                className="h-5 w-5 mr-2"
              >
                <X className="h-4 w-4" />
              </Button>
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{alertMessage}</span>
            </div>
          )}

          {/* Filter and Search Header */}
          <div className="flex gap-3 mb-4">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Product Grid - 6x6 Layout */}
          {products.length === 0 ? (
            <EmptyState onAddProduct={handleAddProduct} />
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {currentProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="pt-4 border-t mt-auto">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Right Section - Cart */}
        <div className="w-full md:w-1/3 h-full flex">
          <Card className="flex-1 flex flex-col">
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Cart</h2>
                <Button variant="ghost" size="icon" onClick={clearCart}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Customer Selection */}
              <div className="mb-4">
                <Select
                  value={selectedCustomer?.id.toString()}
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id.toString() === value);
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scrollable Cart Items */}
              <div className="flex-1 overflow-y-auto min-h-0 border-y">
                {cartItems.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                    onUpdatePrice={updatePrice}
                  />
                ))}
              </div>

              {/* Fixed Cart Footer */}
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{calculateTotal()} XAF</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span className="text-green-500">Free</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{calculateTotal()} XAF</span>
                  </div>
                </div>

                {/* Amount Paid Input */}
                <div className="space-y-2">
                  <Label>Amount Paid</Label>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="text-right"
                  />
                </div>

                {/* Change Amount Display */}
                {amountPaid > 0 && (
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Change</span>
                    <span>{changeAmount} XAF</span>
                  </div>
                )}

                {/* Payment Account Selection */}
                {/* <Select 
                  value={selectedAccount?.id.toString()} 
                  onValueChange={(value) => {
                    const account = treasuryAccounts.find(a => a.id.toString() === value);
                    setSelectedAccount(account || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {treasuryAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select> */}

                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">CASH</SelectItem>
                    <SelectItem value="CARD">CARD</SelectItem>
                    <SelectItem value="MOBILE">MOBILE MONEY</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="text-right"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handlePayment}
                  disabled={amountPaid < calculateTotal()}
                >
                  PAY
                </Button>
                {paymentSuccess && lastSaleData && lastReceiptData && (
                  <div className="space-y-2">
                    <div className="text-green-500 text-sm">
                      Payment Successful! <span className="font-bold">Receipt #{lastReceiptData.receiptId}</span>
                    </div>
                    <div className="text-sm">
                      Customer: <span className="font-medium">{lastReceiptData.customerName}</span>
                    </div>
                    <div className="text-sm">
                      Total: <span className="font-medium">{lastReceiptData.total.toFixed(2)} XAF</span>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => handlePrintReceipt({ receipt: lastReceiptData })}
                      variant="outline"
                    >
                      Print Receipt
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showAddProductForm && (
        <AddProduct onBack={handleCloseAddProductForm} />
      )}
    </div>
  )
}