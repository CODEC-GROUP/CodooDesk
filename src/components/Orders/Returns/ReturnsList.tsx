/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/Shared/ui/dialog"
import { Label } from "@/components/Shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import {
  Search,
  Plus,
  Pen as PenIcon,
  Trash2 as TrashIcon,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { DeleteConfirmationModal } from '@/components/Shared/ui/Modal/delete-confrimation-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Shared/ui/tabs"
import { Textarea } from "@/components/Shared/ui/textarea"
import Pagination from "@/components/Shared/ui/pagination"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from './Empty/EmptyState'
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';
import { SalesAttributes as Sale } from "@/models/Sales"
// Update Return type
interface ReturnedItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  reason: string;
  description: string;
}

interface Return {
  id: string;
  shopId: string;
  orderId: string;
  items: ReturnedItem[];
  total: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
  paymentMethod: string;
}

interface ReturnResponse {
  success: boolean;
  returns?: Return[];
  suggestions?: OrderSuggestion[];
  message?: string;
}

interface ReturnActionResponse {
  success: boolean;
  return?: Return;
  message?: string;
  details?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface OrderProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  product_id: string;
  orderId?: string; // Add orderId field to store the actual order ID
}

interface Order {
  id: string;
  customerName: string;
  date: string;
  total: number;
  product: OrderProduct;
  products?: OrderProduct[]; // Add products array to store all products in the order
}

interface OrderSuggestion {
  id: string;
  receipt_id: string;
  invoice_id: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
  display: string;
}

interface SaleDetailsResponse {
  success: boolean;
  sale?: Sale;
  message?: string;
}

const Returns = () => {
  const { user, business } = useAuthLayout();
  const [returns, setReturns] = useState<Return[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedReturns, setSelectedReturns] = useState<string[]>([])
  const [isAddReturnOpen, setIsAddReturnOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingReturn, setEditingReturn] = useState<Return | null>(null)
  const [filterValue, setFilterValue] = useState("all")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [returnToDelete, setReturnToDelete] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<OrderProduct | null>(null);
  const [returnQuantity, setReturnQuantity] = useState<number>(0);
  const [returnAmount, setReturnAmount] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const itemsPerPage = 10;
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<OrderSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"list" | "add-return">("list");
  const [selectedProducts, setSelectedProducts] = useState<Map<string, { product: OrderProduct, quantity: number }>>(new Map());
  const [totalReturnAmount, setTotalReturnAmount] = useState(0);

  useEffect(() => {
    if (business?.shops && business.shops.length > 0) {
      // For admin/shop_owner, keep it empty to show all shops initially
      if (user?.role === 'admin' || user?.role === 'shop_owner') {
        setSelectedShopId('all');
      } else {
        // For other roles, set it to their assigned shop
        setSelectedShopId(business.shops[0].id);
      }
    }
  }, [business?.shops, user?.role]);

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage

  useEffect(() => {
    console.log('Auth data changed:', { user, business });
    if (user && business) {
      fetchReturns();
    }
  }, [user, business, currentPage, filterValue]);

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleSuggestionClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleSuggestionClickOutside);
    return () => document.removeEventListener('mousedown', handleSuggestionClickOutside);
  }, []);

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch =
      returnItem.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.items[0].reason.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filterValue === "all" ||
      returnItem.status.toLowerCase() === filterValue.toLowerCase()

    const matchesShop = selectedShopId === 'all' || returnItem.shopId === selectedShopId;

    return matchesSearch && matchesFilter && matchesShop;
  })

  const currentReturns = filteredReturns.slice(indexOfFirstItem, indexOfLastItem)

  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleCheckboxChange = (returnId: string) => {
    setSelectedReturns((prev) =>
      prev.includes(returnId)
        ? prev.filter((id) => id !== returnId)
        : [...prev, returnId]
    )
  }

  // Fetch returns
  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      console.log('Starting fetchReturns...', { user, business });
      
      if (!user) {
        console.error('No user found');
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      const shopIds = (user?.role === 'admin' || user?.role === 'shop_owner')
        ? business?.shops?.map(shop => shop.id) || []
        : [business?.shops?.[0]?.id].filter(Boolean) as string[];

      if (shopIds.length === 0) {
        console.error('No shops found');
        toast({
          title: "Error",
          description: "No shops available",
          variant: "destructive",
        });
        return;
      }

      const params = {
        shopIds,
        userRole: user.role,
        shopId: business?.shops?.[0]?.id
      };

      const response = await safeIpcInvoke<ReturnResponse>(
        'entities:return:get-all',
        params,
        { success: false, returns: [] }
      );
      console.log('ReturnsResponse:', response);

      if (response?.success && response.returns) {
        setReturns(response.returns);
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to load returns",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast({
        title: "Error",
        description: "Failed to load returns",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    try {
      setIsProcessing(true);
      const response = await safeIpcInvoke<ReturnActionResponse>('entities:return:delete', {
        returnId
      }, { success: false });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Return deleted successfully",
        });
        await fetchReturns();
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to delete return",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting return:', error);
      toast({
        title: "Error",
        description: "Failed to delete return",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle return creation
  const handleAddReturn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!sale || !selectedProducts.size) {
      toast({
        title: "Error",
        description: "Please select a sale and products",
        variant: "destructive",
      });
      return;
    }

    if (!validateSelectedProducts()) {
      return;
    }

    if (!validateOrderIds()) {
      return;
    }

    const reason = formData.get('reason') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const description = formData.get('description') as string;

    if (!reason || !paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a reason and payment method",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Debug: Log the sale structure before creating return
      const logSaleStructure = () => {
        if (sale) {
          console.log('Sale structure:', JSON.stringify(sale, null, 2));
          if (sale.orders) {
            console.log('Orders structure:', JSON.stringify(sale.orders, null, 2));
          }
        }
      };
      logSaleStructure();
      
      // Debug: Log the items we're sending
      const items = Array.from(selectedProducts.values()).map(({ product, quantity }) => {
        // Ensure orderId is a valid string
        if (!product.orderId) {
          console.error('Missing orderId for product:', product.name);
          throw new Error(`Missing order ID for product: ${product.name}`);
        }
        
        // Log product details for debugging
        console.log(`Processing return for product: ${product.name}`, {
          orderId: product.orderId,
          productId: product.product_id,
          hasValidProductId: !!(product.product_id && product.product_id.trim() !== '')
        });
        
        return {
          orderId: product.orderId,
          // Only include productId if it exists and is not an empty string
          productId: product.product_id && product.product_id.trim() !== '' ? product.product_id : null,
          productName: product.name, // Always use the name from the selected product
          quantity,
          price: product.price,
          reason,
          description
        };
      });
      
      console.log('Return items to be created:', JSON.stringify(items, null, 2));
      
      // Double-check that all items have orderId
      const missingOrderIds = items.filter(item => !item.orderId);
      if (missingOrderIds.length > 0) {
        console.error('Some items are missing orderId:', missingOrderIds);
        toast({
          title: "Error",
          description: "Some products are missing order information. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      const returnData = {
        saleId: sale.id,
        shopId: (user?.role === 'admin' || user?.role === 'shop_owner')
          ? selectedShopId
          : business?.shops?.[0]?.id,
        items,
        total: totalReturnAmount,
        status: 'pending',
        customer: {
          id: sale.customer_id,
          name: sale.customer?.first_name || 'Walking Customer',
        },
        paymentMethod
      };

      console.log('Creating return with data:', returnData);
      const response = await safeIpcInvoke<ReturnActionResponse>('entities:return:create', { returnData }, { success: false });
      console.log('Return creation response:', response);

      if (response?.success && response.return) {
        toast({
          title: "Success",
          description: "Return created successfully",
        });
        
        // Reset form state
        setSale(null);
        setSelectedOrder(null);
        setSelectedProducts(new Map());
        setTotalReturnAmount(0);
        setSearchTerm('');
        setSuggestions([]);
        setShowSuggestions(false);
        
        // Switch back to list tab
        setActiveTab("list");
        
        // Refresh the returns list
        await fetchReturns();
        
        // Reset pagination to first page
        setCurrentPage(1);
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to create return",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating return:', error);
      toast({
        title: "Error",
        description: "Failed to create return",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Update return amount when quantity changes
  const handleQuantityChange = (productId: string, qty: number) => {
    const product = selectedOrder?.products?.find(p => p.id === productId);
    if (product && qty > 0 && qty <= product.quantity) {
      const newSelectedProducts = new Map(selectedProducts);
      newSelectedProducts.set(productId, { product, quantity: qty });
      setSelectedProducts(newSelectedProducts);
      updateTotalReturnAmount(newSelectedProducts);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const openDetailModal = (returnItem: Return) => {
    setSelectedReturn(returnItem)
    setIsDetailOpen(true)
  }

  const handleEditClick = (returnItem: Return) => {
    setEditingReturn(returnItem);
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (updatedReturn: Return) => {
    try {
      setIsProcessing(true);
      const response = await safeIpcInvoke<ReturnActionResponse>('entities:return:update', {
        returnId: updatedReturn.id,
        returnData: updatedReturn
      }, { success: false });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Return updated successfully",
        });
        await fetchReturns();
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to update return",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating return:', error);
      toast({
        title: "Error",
        description: "Failed to update return",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setEditingReturn(null);
      setIsEditModalOpen(false);
    }
  };

  const handleDeleteClick = (returnId: string) => {
    setReturnToDelete(returnId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (returnToDelete) {
      try {
        setIsProcessing(true);
        console.log('Attempting to delete return:', returnToDelete);
        
        const response = await safeIpcInvoke<ReturnActionResponse>('entities:return:delete', {
          returnId: returnToDelete
        }, { success: false });

        console.log('Delete response:', response);

        if (response?.success) {
          toast({
            title: "Success",
            description: response.message || "Return deleted successfully",
          });
          await fetchReturns();
        } else {
          toast({
            title: "Error",
            description: response?.message || "Failed to delete return",
            variant: "destructive",
          });
          if (response?.details) {
            console.error('Delete error details:', response.details);
          }
        }
      } catch (error) {
        console.error('Error deleting return:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete return",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setReturnToDelete(null);
        setIsDeleteModalOpen(false);
      }
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReturns(filteredReturns.map(item => item.id));
    } else {
      setSelectedReturns([]);
    }
  };

  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
    if (value.length >= 2) {
      try {
        const shopIds = (user?.role === 'admin' || user?.role === 'shop_owner')
          ? business?.shops?.map(shop => shop.id) || []
          : [business?.shops?.[0]?.id].filter(Boolean);

        console.log('Search params:', { 
          searchTerm: value, 
          shopIds,
          userRole: user?.role,
          businessShops: business?.shops
        });

        if (shopIds.length === 0) {
          console.error('No shop IDs available');
          toast({
            title: 'Error',
            description: 'No shops available',
            variant: 'destructive',
          });
          return;
        }

        const result = await safeIpcInvoke<ReturnResponse>('entities:return:get-suggestions', {
          searchTerm: value,
          shopIds
        });

        console.log('Search result:', result);
        if (result?.success && result.suggestions) {
          console.log('Suggestions:', result.suggestions);
          setSuggestions(result.suggestions);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch order suggestions',
          variant: 'destructive',
        });
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (suggestion: OrderSuggestion) => {
    try {
      const response = await safeIpcInvoke<SaleDetailsResponse>('order-management:get-sale-details', {
        id: suggestion.id,
      });

      if (response?.success && response.sale) {
        setSale(response.sale);
        
        // Debug: Log the sale structure
        console.log('Sale structure:', JSON.stringify(response.sale, null, 2));
        
        // Create an array of products from all orders in the sale
        const products: OrderProduct[] = response.sale?.orders?.map(order => {
          console.log('Processing order:', order);
          return {
            id: order.id || '',
            name: order.product?.name || (order as any)?.productName || '',
            price: order.sellingPrice || 0,
            quantity: order.quantity || 0,
            total: (order.quantity || 0) * (order.sellingPrice || 0),
            product_id: order.product?.id || '',
            orderId: order.id || '', // Store the actual order ID
          };
        }) || [];
        
        const order: Order = {
          id: response.sale?.id || '',
          customerName: response.sale?.customer?.first_name || 'Walking Customer',
          date: response.sale?.createdAt?.toISOString() || '',
          total: response.sale?.netAmount || 0,
          product: products[0] || {
            id: '',
            name: '',
            price: 0,
            quantity: 0,
            total: 0,
            product_id: '',
            orderId: '',
          },
          products: products, // Store all products
        };

        console.log('Selected order:', order);
        setSelectedOrder(order);
        setSelectedProducts(new Map());
        setTotalReturnAmount(0);
        setShowSuggestions(false);
        setSearchTerm(suggestion.display);
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to get order details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: "Error",
        description: "Failed to get order details",
        variant: "destructive",
      });
    }
  };

  // Update total return amount when products or quantities change
  const updateTotalReturnAmount = (products: Map<string, { product: OrderProduct, quantity: number }>) => {
    const total = Array.from(products.values()).reduce((acc, { product, quantity }) => acc + quantity * product.price, 0);
    setTotalReturnAmount(total);
  };

  // Validate that all selected products have valid quantities
  const validateSelectedProducts = () => {
    for (const [_, { quantity }] of selectedProducts.entries()) {
      if (quantity <= 0) {
        toast({
          title: "Error",
          description: "Please specify a valid quantity for all selected products",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  // Validate that all order IDs are valid UUIDs
  const validateOrderIds = () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    for (const [_, { product }] of selectedProducts.entries()) {
      if (!product.orderId) {
        console.error('Missing order ID for product:', product.name);
        toast({
          title: "Error",
          description: `Missing order ID for product: ${product.name}`,
          variant: "destructive",
        });
        return false;
      }
      
      if (!uuidRegex.test(product.orderId)) {
        console.error('Invalid order ID format:', product.orderId, 'for product:', product.name);
        toast({
          title: "Error",
          description: `Invalid order ID format for product: ${product.name}`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Returns List</TabsTrigger>
          <TabsTrigger value="add-return">Process Return</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {returns.length === 0 && !isLoading ? (
            <EmptyState onCreateReturn={() => setActiveTab("add-return")} />
          ) : (
            <div className="space-y-6">
              {/* Search and Filter Section */}
              <div className="flex items-center gap-4 py-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                {(user?.role === 'admin' || user?.role === 'shop_owner') && (
                  <Select
                    value={selectedShopId}
                    onValueChange={setSelectedShopId}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Shop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shops</SelectItem>
                      {business?.shops?.map((shop: any) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="relative flex-1" ref={searchRef}>
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search returns..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-8"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <Card className="absolute z-10 w-full mt-1">
                      <CardContent className="p-2">
                        {suggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <div className="font-medium">{suggestion.display}</div>
                            <div className="text-sm text-gray-500">
                              Total: {suggestion.total_amount} • Date: {suggestion.created_at}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Returns Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedReturns.length === filteredReturns.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Return ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.slice(startIndex, endIndex).map((returnItem) => (
                      <TableRow key={returnItem.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedReturns.includes(returnItem.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedReturns([...selectedReturns, returnItem.id]);
                              } else {
                                setSelectedReturns(selectedReturns.filter(id => id !== returnItem.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{returnItem.id}</TableCell>
                        <TableCell>{returnItem.createdAt}</TableCell>
                        <TableCell>{returnItem.customer.name}</TableCell>
                        <TableCell>{returnItem.orderId}</TableCell>
                        <TableCell>
                          {returnItem.items[0].productName} (x{returnItem.items[0].quantity})
                        </TableCell>
                        <TableCell>{returnItem.total.toLocaleString()} FCFA</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(returnItem.status)}`}>
                            {returnItem.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openDetailModal(returnItem)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(returnItem)}>
                              <PenIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(returnItem.id)}>
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredReturns.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="add-return">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Process New Return</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddReturn} className="space-y-6">

                {/* Order Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="order" className="text-right">Order</Label>
                  <div className="col-span-3 relative">
                    <Input
                      type="text"
                      placeholder="Search for order by ID, customer name, or reciept/invoice ID..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
                      >
                        {suggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <div className="font-medium">{suggestion.receipt_id}</div>
                            <div className="text-sm text-gray-600">
                              {suggestion.customer_name} - {suggestion.total_amount.toLocaleString()} XAF
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Products Table */}
                {selectedOrder && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-4">Order Products</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">Select</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Available Qty</TableHead>
                          <TableHead>Return Qty</TableHead>
                          <TableHead>Return Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.products?.map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedProducts.has(product.id)}
                                onChange={() => {
                                  const newSelectedProducts = new Map(selectedProducts);
                                  if (selectedProducts.has(product.id)) {
                                    newSelectedProducts.delete(product.id);
                                  } else {
                                    newSelectedProducts.set(product.id, { product, quantity: 1 });
                                  }
                                  setSelectedProducts(newSelectedProducts);
                                  updateTotalReturnAmount(newSelectedProducts);
                                }}
                              />
                            </TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.price.toLocaleString()} XAF</TableCell>
                            <TableCell>{product.quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                max={product.quantity}
                                className="w-20"
                                value={selectedProducts.get(product.id)?.quantity || 0}
                                onChange={(e) => {
                                  handleQuantityChange(product.id, parseInt(e.target.value));
                                }}
                                disabled={!selectedProducts.has(product.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {((selectedProducts.get(product.id)?.quantity || 0) * product.price).toLocaleString()} XAF
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-lg font-semibold">
                        Total Return Amount: {totalReturnAmount.toLocaleString()} XAF
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedProducts.size} product(s) selected
                      </div>
                    </div>
                    
                    {selectedProducts.size === 0 && (
                      <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-md">
                        Please select at least one product to return by checking the checkbox next to the product.
                      </div>
                    )}
                  </div>
                )}

                {/* Return Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reason" className="text-right">Reason</Label>
                    <Select name="reason" defaultValue="">
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEFECTIVE">Defective Product</SelectItem>
                        <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                        <SelectItem value="NOT_AS_DESCRIBED">Not as Described</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Textarea
                      name="description"
                      className="col-span-3"
                      placeholder="Additional details about the return..."
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="paymentMethod" className="text-right">Refund Method</Label>
                    <Select name="paymentMethod" defaultValue="">
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select refund method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                        <SelectItem value="BANK">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isProcessing || selectedProducts.size === 0}
                  >
                    {isProcessing ? "Processing..." : "Create Return"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setReturnToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Edit Return Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Return</DialogTitle>
          </DialogHeader>
          {editingReturn && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleEditSave(editingReturn);
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select
                  value={editingReturn.items[0].reason}
                  onValueChange={(value) => {
                    setEditingReturn({
                      ...editingReturn,
                      items: [{
                        ...editingReturn.items[0],
                        reason: value
                      }]
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFECTIVE">Defective Product</SelectItem>
                    <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                    <SelectItem value="NOT_AS_DESCRIBED">Not as Described</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  value={editingReturn.items[0].description}
                  onChange={(e) => {
                    setEditingReturn({
                      ...editingReturn,
                      items: [{
                        ...editingReturn.items[0],
                        description: e.target.value
                      }]
                    });
                  }}
                  placeholder="Additional details about the return..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Refund Method</Label>
                <Select
                  value={editingReturn.paymentMethod}
                  onValueChange={(value) => {
                    setEditingReturn({
                      ...editingReturn,
                      paymentMethod: value
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select refund method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Returns;
