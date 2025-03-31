"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select" // Removed SelectPortal
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
  inventories?: InventoryItem[]; // Add inventories to track warehouse information
}

// Define the CartItem interface (extends Product with quantity and inventory)
interface CartItem extends Product {
  quantity: number;
  actualPrice: number;
  selectedInventory?: InventoryItem; // Keep this for compatibility
}

// Define the Inventory interface
interface Inventory {
  id: string;
  name: string;
  description?: string;
  shopId?: string | null;
}

// Define the InventoryItem interface
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

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  // Normalize the image path by converting backslashes to forward slashes
  const normalizedImagePath = product.featuredImage?.replace(/\\/g, '/');
  
  // Check if product has multiple inventories
  const hasMultipleInventories = product.inventories && product.inventories.length > 1;

  return (
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

        {/* Removed warehouse count badge */}

        <div className="flex justify-center mb-2">
          <Image
            src={normalizedImagePath || '/assets/images/box.png'}
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
  );
};

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onUpdateItemWarehouse: (itemId: string, inventoryId: string) => void; // Added prop
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdatePrice,
  onUpdateItemWarehouse // Added prop
}) => {
  // Filter valid inventories directly without enforcing uniqueness by inventory_id
  const validInventoriesForDropdown = React.useMemo(() => {
    if (!Array.isArray(item.inventories)) {
      return []; // Return empty array if inventories is not an array
    }
    // Filter out items without a valid inventory_id or inventory object
    return item.inventories.filter(inv => 
      inv && 
      typeof inv.id === 'string' && inv.id.trim() !== '' && // Use the InventoryItem ID as the key/value
      inv.inventory && // Ensure inventory details exist
      typeof inv.inventory_id === 'string' && inv.inventory_id.trim() !== ''
    );
  }, [item.inventories]); // Recalculate only when item.inventories changes

  return (
  <div className="flex flex-col py-2 border-b px-2"> {/* Removed cursor-pointer */}
    <div className="flex justify-between items-start mb-1 pb-1"> {/* Added mb-1 and pb-1 */}
      <div className="space-y-1 flex-1 mr-2"> {/* Added flex-1 mr-2 */}
        <h4 className="font-medium text-sm truncate">{item.name}</h4> {/* Added truncate */}
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

      {/* REMOVED Duplicated Quantity Controls */}
      {/* <div className="flex items-center gap-1">
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
      </div> */}
    </div>

    {/* Warehouse Selection for this item - Use the filtered (but not unique by ID) list */}
    {/* Show dropdown if there's at least one valid inventory item */}
    {validInventoriesForDropdown.length > 0 && (
      <Select
        // Use the specific InventoryItem ID (inv.id) for the value if available, fallback needed if selectedInventory isn't set yet
        value={item.selectedInventory?.id ?? ''} 
        // Pass the InventoryItem ID (inv.id) to the handler
        onValueChange={(inventoryItemId) => onUpdateItemWarehouse(item.id, inventoryItemId)} 
      >
        <SelectTrigger className="h-8 text-xs w-full relative z-10">
          <SelectValue placeholder="Select Stock Entry / Warehouse" />
        </SelectTrigger>
        <SelectContent className="z-50">
          {validInventoriesForDropdown.map((inv) => { // Map over the filtered list
              // Log the inventory item being rendered to check its quantity
              console.log(`Rendering dropdown item for ${item.name} - Warehouse ${inv.inventory?.name} (Item ID: ${inv.id}):`, inv);
              return (
                // Use the InventoryItem's own ID (inv.id) as the key and value
                <SelectItem key={`${item.id}-${inv.id}`} value={inv.id} className="text-xs">
                  {/* Display warehouse name and quantity for this specific inventory item */}
                  {inv.inventory?.name || 'Unnamed Warehouse'} ({inv.quantity} in stock)
                  {/* Optionally add more details like batch number if available */}
                </SelectItem>
              );
          })}
        </SelectContent>
      </Select>
    )}
  </div>
  );
};

// Define the default walk-in customer
const defaultCustomer: Customer = {
  id: 0,
  name: 'Walk-in Customer',
  phone: ''
};

export function Pos() {
  const { user, business, availableShops } = useAuthLayout();
  const [selectedShopId, setSelectedShopId] = useState<string>(
    (user?.role === 'admin' || user?.role === 'shop_owner') 
      ? business?.shops?.[0]?.id || ''
      : availableShops?.[0]?.id || ''
  );
  const [shopId, setShopId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentType, setPaymentType] = useState("CASH")
  const [currentPage, setCurrentPage] = useState(1)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const itemsPerPage = 36
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(defaultCustomer);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // const [selectedAccount, setSelectedAccount] = useState<TreasuryAccount | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [lastReceiptData, setLastReceiptData] = useState<any>(null);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  // Removed selectedWarehouse state
  const [availableWarehouses, setAvailableWarehouses] = useState<Inventory[]>([]); // Keep this to know *which* warehouses exist

  // Extract fetchProducts function to make it available throughout the component
  const fetchProducts = async () => {
    if (!business?.id) {
      console.log('No business ID during product load');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const shopIds = business.shops
        ?.filter(shop => shop?.id)
        .map(shop => shop.id) || [];

      console.log('Found shop IDs:', shopIds);

      if (shopIds.length === 0) {
        console.log('No shop IDs found');
        setError('No shops available');
        return;
      }

      const shopIdToUse = (user?.role === 'admin' || user?.role === 'shop_owner')
        ? selectedShopId
        : availableShops?.[0]?.id;

      if (!shopIdToUse) {
        console.log('No shop ID to use');
        setError('No shop selected');
        return;
      }

      // Fetch products with inventory information
      const response = await safeIpcInvoke<{
        success: boolean;
        message?: string;
        products: any[];
      }>('inventory:product:get-all-with-inventories', {
        shopIds: [shopIdToUse],
        businessId: business.id,
        includeInventories: true
      }, {
        success: false,
        products: []
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch products');
      }

      setProducts(response.products || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
      setIsLoading(false);
    }
  };

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
    
    // If product has inventories, use the first one as default or the selected warehouse
    let selectedInventory: InventoryItem | undefined = undefined;
    
    if (product.inventories && product.inventories.length > 0) {
      // If no warehouse selected or no match found, use the first inventory as default
      // Removed the check for the now non-existent selectedWarehouse state
      if (!selectedInventory) {
        selectedInventory = product.inventories[0];
        // No need to set global selectedWarehouse anymore
      }
    }
    
    const existingItem = cartItems.find(item => item.id === product.id)
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      // --- Start Corrected Logic ---
      // Directly use product.inventories. Ensure it's an array.
      const productInventories = Array.isArray(product.inventories) ? product.inventories : [];

      // Select the default inventory from the full list (e.g., the first one if available)
      let defaultInventoryForItem: InventoryItem | undefined = undefined;
      if (productInventories.length > 0) {
          // Simple selection of the first item as default for now
          defaultInventoryForItem = productInventories[0]; 
      }

      // Add the new item to the cart, passing the *complete* inventories list.
      // Ensure we are creating a new object for the cart item.
      const newItem: CartItem = {
        ...product, // Spread product properties first
        inventories: productInventories, // Explicitly set the full inventories list
        quantity: 1,
        actualPrice: product.sellingPrice,
        selectedInventory: defaultInventoryForItem // Use the determined default
      };

      setCartItems(prevCartItems => [...prevCartItems, newItem]);
      // --- End Corrected Logic ---
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

      const currentShopId = (user?.role === 'admin' || user?.role === 'shop_owner')
        ? selectedShopId
        : availableShops?.[0]?.id;

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

      // Include inventory information with each cart item
      const cartItemsWithInventory = cartItems.map(item => ({
        ...item,
        inventoryId: item.selectedInventory?.inventory_id || null,
        warehouseId: item.selectedInventory?.inventory_id || null
      }));

      const saleData = {
        shopId: currentShopId,
        customer: customer,
        cartItems: cartItemsWithInventory,
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

        // Refresh product data to show updated inventory quantities
        fetchProducts();

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
      
      const currentShop = (user?.role === 'admin' || user?.role === 'shop_owner')
        ? business?.shops?.find(shop => shop.id === selectedShopId)
        : availableShops?.[0];

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
  }; // Added missing closing brace

  const updatePrice = (id: string, newPrice: number) => {
    setCartItems(cartItems.map(item =>
      item.id === id ? { ...item, actualPrice: newPrice } : item
    ));
  };

  // Handler to update the selected inventory item for a specific cart item
  const handleUpdateItemWarehouse = (itemId: string, inventoryItemId: string) => {
    // Use functional update for safety when new state depends on previous state
    setCartItems(currentCartItems =>
      currentCartItems.map(item => {
        if (item.id === itemId) {
          // Find the specific InventoryItem by its own ID (inventoryItemId)
          const newSelectedInventory = item.inventories?.find(inv => inv.id === inventoryItemId);
          // Ensure a new object is created for the item AND the inventory to trigger re-render reliably
          return {
            ...item,
            // Create a new object reference for selectedInventory
            selectedInventory: newSelectedInventory ? { ...newSelectedInventory } : undefined
          };
        }
        return item;
      })
    );
  };

  useEffect(() => {
    setChangeAmount(amountPaid - calculateTotal());
  }, [amountPaid, cartItems]);

  useEffect(() => {
    if (!business?.id && !authChecked) {
      console.log('No business ID found in ProductGrid');
      setError('Authentication required');
      setAuthChecked(true);
      return;
    }

    if (business?.id && !authChecked) {
      console.log('Loading products in ProductGrid');
      fetchProducts();
      setAuthChecked(true);
    }
  }, [business?.id, authChecked, selectedShopId, availableShops]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Get shop IDs based on user role
        const shopIds = (user?.role === 'admin' || user?.role === 'shop_owner')
          ? business?.shops?.map(shop => shop.id) || []
          : [business?.shops?.[0]?.id].filter(Boolean) as string[];

        const response = await safeIpcInvoke('entities:customer:get-all', {
          shopIds,
          userRole: user?.role
        }, {
          success: false,
          customers: []
        });

        if (response?.success) {
          setCustomers(response.customers);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <AlertCircle className="mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]"> {/* Removed overflow-hidden */}
      <div className="flex flex-col md:flex-row gap-4 p-4 h-full">
        {/* Left Section - Product Catalog */}
        <div className="w-full md:w-3/4 bg-white rounded-lg shadow-sm p-4 flex flex-col h-full">
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

            {(user?.role === 'admin' || user?.role === 'shop_owner') && (
              <Select
                value={selectedShopId}
                onValueChange={setSelectedShopId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Shop" />
                </SelectTrigger>
                <SelectContent>
                  {business?.shops?.map((shop: any) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Product Grid - 6x6 Layout */}
          {products.length === 0 ? (
            <EmptyState onAddProduct={handleAddProduct} />
          ) : (
            <div className="flex-1 min-h-0 pb-4"> {/* Removed overflow-y-auto */}
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
            <CardContent className="py-4 flex flex-col h-full"> {/* Changed p-4 to py-4 */}
              <div className="flex justify-between items-center mb-4 px-4"> {/* Added px-4 */}
                <h2 className="text-xl font-bold">Cart</h2>
                <Button variant="ghost" size="icon" onClick={clearCart}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Customer Selection */}
              <div className="mb-4 px-4"> {/* Added px-4 */}
                <Select
                  value={selectedCustomer?.id.toString()}
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id.toString() === value);
                    setSelectedCustomer(customer || defaultCustomer);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Walk-in Customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Removed Global Warehouse Selection Dropdown */}

              {/* Cart Items (Removed scroll) */}
              <div className="flex-1 min-h-0 border-y h-96"> {/* Removed overflow-y-auto */}
                {cartItems.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                    onUpdatePrice={updatePrice}
                    onUpdateItemWarehouse={handleUpdateItemWarehouse} // Pass handler down
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
    </div>
  )
}
