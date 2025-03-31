"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ChevronLeft, Plus, Trash2, Store, ChevronDown } from "lucide-react"
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
import { Label } from "@/components/ui/label"
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

interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  inventoryId?: string; // Added for inventory tracking
  selectedInventory?: InventoryItem; // Added to track selected inventory
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
  inventories?: InventoryItem[]; // Added to track available inventories
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

interface Inventory {
  id: string;
  name: string;
  description?: string;
  shopId?: string | null;
}

interface InventoryItem {
  id: string;
  product_id: string;
  inventory_id: string;
  inventory?: Inventory;
  quantity: number;
  unit_cost: number;
  selling_price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export function AddOrder({ onBack }: AddOrderProps) {
  const { user, business, availableShops } = useAuthLayout();
  const [shopId, setShopId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")
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
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [isProductSearchFocused, setIsProductSearchFocused] = useState(false)
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1)
  const [availableInventories, setAvailableInventories] = useState<Inventory[]>([]);

  // Add default walk-in customer
  const defaultCustomer: Customer = {
    id: 'walk-in',
    name: 'Walk-in Customer',
    email: '',
    phone: ''
  };

  // Add shop ID handling similar to OrderList
  const shopIds = useMemo(() => {
    return (user?.role === 'admin' || user?.role === 'shop_owner')
      ? business?.shops?.map(shop => shop.id) || []
      : [availableShops?.[0]?.id].filter(Boolean) as string[];
  }, [user, business, availableShops]);

  // Initialize shopId with the first available shop
  useEffect(() => {
    if (shopIds.length > 0 && !shopId) {
      setShopId(shopIds[0]);
      setSelectedShopId(shopIds[0]);
    }
  }, [shopIds, shopId]);

  useEffect(() => {
    if (shopId) {
      fetchCustomers();
      fetchProducts();
      checkPrinter();
    }
  }, [shopId]);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      
      // Get shop IDs based on user role
      const shopIds = (user?.role === 'admin' || user?.role === 'shop_owner')
        ? business?.shops?.map(shop => shop.id) || []
        : [availableShops?.[0]?.id].filter(Boolean) as string[];
      
      const response = await safeIpcInvoke<CustomerResponse>('entities:customer:get-all', {
        shopIds,
        userRole: user?.role
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
      
      // Use the same endpoint as ProductGrid to get products with inventories in a single request
      const response = await safeIpcInvoke<ProductResponse>('inventory:product:get-all-with-inventories', {
        shopIds,
        businessId: business?.id,
        includeInventories: true
      }, {
        success: false,
        products: []
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch products');
      }

      setProducts(response.products || []);
      
      // No need for a separate warehouse request since inventories are included with products
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
    if (!shopId) {
      toast({
        title: "Error",
        description: "No shop selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const customer = customers.find(c => c.id === selectedCustomer);

      // Format order items to match the order management service structure
      const formattedOrderItems = orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        sellingPrice: item.unitPrice,
        inventoryId: item.selectedInventory?.inventory_id || null, // Include inventory information
        warehouseId: item.selectedInventory?.inventory_id || null // For backward compatibility
      }));

      const orderData = {
        orderItems: formattedOrderItems,
        customer: selectedCustomer === 'walk-in' ? null : customer,
        paymentMethod,
        paymentStatus,
        deliveryStatus,
        amountPaid: calculateTotal(),
        changeGiven: 0,
        shopId: shopId,
        discount,
        salesPersonId: user?.id
      };

      const response = await safeIpcInvoke<OrderResponse>(
        'order-management:create-sale',
        orderData
      );

      if (response?.success) {
        setLastOrderResponse(response);
        toast({
          title: "Success",
          description: `Order ${paymentStatus === 'paid' ? 'receipt' : 'invoice'} created successfully`,
        });
        onBack();
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
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
      p.status !== 'out_of_stock'
    ).slice(0, 6) // Limit to 6 suggestions like Google
    : [];

  const filteredCustomers = customerSearchTerm
    ? customers.filter(c => 
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearchTerm)) ||
        (c.email && c.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
      )
    : customers;

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

  // Function to highlight matching text in search results
  const highlightMatchingText = (text: string, query: string) => {
    if (!query) return text;
    
    try {
      const regex = new RegExp(`(${query})`, 'gi');
      const parts = text.split(regex);
      
      return (
        <>
          {parts.map((part, i) => 
            regex.test(part) ? 
              <span key={i} className="bg-yellow-100">{part}</span> : 
              <span key={i}>{part}</span>
          )}
        </>
      );
    } catch (e) {
      // If regex fails (e.g., with special characters), return the original text
      return text;
    }
  };

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchTerm) return;
    
    // Down arrow
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedProductIndex(prev => 
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      );
    }
    
    // Up arrow
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedProductIndex(prev => prev > 0 ? prev - 1 : 0);
    }
    
    // Enter key
    if (e.key === 'Enter' && highlightedProductIndex >= 0) {
      e.preventDefault();
      const product = filteredProducts[highlightedProductIndex];
      if (product) {
        addProductToOrder(product);
      }
    }
    
    // Escape key
    if (e.key === 'Escape') {
      setSearchTerm('');
      setIsProductSearchFocused(false);
      setHighlightedProductIndex(-1);
    }
  };
  
  const addProductToOrder = (product: Product) => {
    if (tempQuantity > product.quantity) {
      toast({
        title: "Error",
        description: "Quantity exceeds available stock",
        variant: "destructive",
      });
      return;
    }
    
    // Check if product has inventories
    let selectedInventory: InventoryItem | undefined = undefined;
    
    if (product.inventories && product.inventories.length > 0) {
      // Use the first inventory as default
      selectedInventory = product.inventories[0];
    }
    
    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      unitPrice: product.sellingPrice,
      quantity: tempQuantity,
      total: product.sellingPrice * tempQuantity,
      inventoryId: selectedInventory?.inventory_id,
      selectedInventory: selectedInventory
    };
    
    setOrderItems([...orderItems, newItem]);
    setSearchTerm("");
    setSelectedProduct(null);
    setTempQuantity(1);
    setHighlightedProductIndex(-1);
  };

  const handleUpdateItemInventory = (itemId: string, inventoryItemId: string) => {
    setOrderItems(currentOrderItems =>
      currentOrderItems.map(item => {
        if (item.id === itemId && item.productId) {
          // Find the product for this order item
          const product = products.find(p => p.id === item.productId);
          
          if (product?.inventories) {
            // Find the specific InventoryItem by its ID
            const newSelectedInventory = product.inventories.find(inv => inv.id === inventoryItemId);
            
            // Create a new object for the item with updated inventory
            return {
              ...item,
              inventoryId: newSelectedInventory?.inventory_id,
              selectedInventory: newSelectedInventory ? { ...newSelectedInventory } : undefined
            };
          }
        }
        return item;
      })
    );
  };

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
          {/* Shop Selection - Only for admin or shop owner */}
          {(user?.role === 'admin' || user?.role === 'shop_owner') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Shop</label>
              <Select 
                value={shopId || ''} 
                onValueChange={(value) => {
                  setShopId(value);
                  setSelectedShopId(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Shop" />
                </SelectTrigger>
                <SelectContent>
                  {business?.shops?.map((shop: any) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      <div className="flex items-center">
                        <Store className="h-4 w-4 mr-2" />
                        {shop.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedCustomer 
                    ? customers.find(c => c.id === selectedCustomer)?.name || "Select customer" 
                    : "Select customer"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search customers..." 
                    value={customerSearchTerm}
                    onValueChange={setCustomerSearchTerm}
                  />
                  <CommandList>
                    <CommandGroup>
                      {filteredCustomers.map(customer => (
                        <CommandItem
                          key={customer.id}
                          value={customer.id}
                          onSelect={() => {
                            setSelectedCustomer(customer.id);
                            setCustomerSearchTerm("");
                          }}
                        >
                          <div className="flex flex-col">
                            <span>{customer.name}</span>
                            {customer.phone && (
                              <span className="text-xs text-muted-foreground">{customer.phone}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <div className="py-6 text-center text-sm">No customers found</div>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Product Search and Add */}
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedProductIndex(-1);
                  }}
                  onFocus={() => setIsProductSearchFocused(true)}
                  onBlur={() => {
                    // Delay hiding the dropdown to allow clicking on items
                    setTimeout(() => setIsProductSearchFocused(false), 200);
                  }}
                  onKeyDown={handleProductKeyDown}
                  className="w-full"
                />
                
                {searchTerm && (isProductSearchFocused || highlightedProductIndex >= 0) && (
                  <div className="absolute mt-1 w-full max-h-80 overflow-auto bg-white border rounded-md shadow-lg z-20">
                    {filteredProducts.length > 0 ? (
                      <>
                        {filteredProducts.map((product, index) => (
                          <div
                            key={product.id}
                            className={`p-3 cursor-pointer border-b last:border-b-0 ${
                              index === highlightedProductIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => addProductToOrder(product)}
                            onMouseEnter={() => setHighlightedProductIndex(index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {/* Highlight matching text */}
                                  {highlightMatchingText(product.name, searchTerm)}
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                  <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs mr-2">
                                    SKU: {product.sku}
                                  </span>
                                  <span className="text-green-600 font-medium">
                                    {product.sellingPrice} XAF
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span className={`${product.quantity < 5 ? 'text-orange-500' : 'text-gray-600'}`}>
                                    Stock: {product.quantity}
                                  </span>
                                  {/* Show inventory count if available */}
                                  {product.inventories && product.inventories.length > 0 && (
                                    <>
                                      <span className="mx-2">•</span>
                                      <span className="text-blue-600">
                                        {product.inventories.length} {product.inventories.length === 1 ? 'inventory' : 'inventories'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
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
                                <Button 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addProductToOrder(product);
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No products found. Try a different search term or 
                        <Button 
                          variant="link" 
                          className="px-1 text-blue-600"
                          onClick={() => {
                            setManualProductName(searchTerm);
                            setSearchTerm('');
                          }}
                        >
                          add a manual product
                        </Button>
                      </div>
                    )}
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
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span>{item.productName}</span>
                        {/* Add inventory selection dropdown */}
                        {item.productId && (() => {
                          // Find the product for this order item
                          const product = products.find(p => p.id === item.productId);
                          
                          // Get valid inventories for this product
                          const validInventories = product?.inventories?.filter(inv => 
                            inv && 
                            typeof inv.id === 'string' && 
                            inv.id.trim() !== '' && 
                            inv.inventory && 
                            typeof inv.inventory_id === 'string' && 
                            inv.inventory_id.trim() !== ''
                          );
                          
                          // Only show dropdown if there are valid inventories
                          return validInventories && validInventories.length > 0 ? (
                            <Select
                              value={item.selectedInventory?.id || ''}
                              onValueChange={(inventoryItemId) => handleUpdateItemInventory(item.id, inventoryItemId)}
                            >
                              <SelectTrigger className="h-8 text-xs w-full mt-1 relative z-10">
                                <SelectValue placeholder="Select Stock Entry / Inventory" />
                              </SelectTrigger>
                              <SelectContent className="z-50">
                                {validInventories.map((inv) => (
                                  <SelectItem key={`${item.id}-${inv.id}`} value={inv.id} className="text-xs">
                                    {inv.inventory?.name || 'Unnamed Inventory'} ({inv.quantity} in stock)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">{item.unitPrice} XAF</td>
                    <td className="px-4 py-2 text-right">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value);
                          if (newQuantity > 0) {
                            setOrderItems(orderItems.map(orderItem => 
                              orderItem.id === item.id 
                                ? {
                                    ...orderItem,
                                    quantity: newQuantity,
                                    total: orderItem.unitPrice * newQuantity
                                  }
                                : orderItem
                            ));
                          }
                        }}
                        className="w-20 text-right"
                      />
                    </td>
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