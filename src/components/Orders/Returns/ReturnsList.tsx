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
}

interface Return {
  id: string;
  orderId: string;
  items: ReturnedItem[];
  total: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
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
}

interface Order {
  id: string;
  customerName: string;
  date: string;
  total: number;
  product: OrderProduct;
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

    return matchesSearch && matchesFilter
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

      const shopIds = business?.shops?.map(shop => shop.id) || [];
      if (shopIds.length === 0) {
        console.error('No shops found');
        toast({
          title: "Error",
          description: "No shops available",
          variant: "destructive",
        });
        return;
      }

      const response = await safeIpcInvoke<ReturnResponse>('entities:return:get-all',
        {
          userRole: user.role,
          shopIds,
          shopId: shopIds[0]
        },
        {
          success: false,
          returns: []
        }
      );

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

  const handleApproveReturn = async (returnId: string) => {
    try {
      setIsProcessing(true);
      const response = await safeIpcInvoke<ReturnActionResponse>('returns:approve', {
        returnId
      }, { success: false });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Return approved successfully",
        });
        await fetchReturns();
      } else {
        toast({
          title: "Error",
          description: "Failed to approve return",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error approving return:', error);
      toast({
        title: "Error",
        description: "Failed to approve return",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectReturn = async (returnId: string) => {
    try {
      setIsProcessing(true);
      const response = await safeIpcInvoke<ReturnActionResponse>('returns:reject', {
        returnId
      }, { success: false });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Return rejected successfully",
        });
        await fetchReturns();
      } else {
        toast({
          title: "Error",
          description: "Failed to reject return",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error rejecting return:', error);
      toast({
        title: "Error",
        description: "Failed to reject return",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    try {
      setIsProcessing(true);
      const response = await safeIpcInvoke<ReturnActionResponse>('returns:delete', {
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
          description: "Failed to delete return",
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

    if (!sale || !selectedProduct || !returnQuantity) {
      toast({
        title: "Error",
        description: "Please select a sale and product, and specify return quantity",
        variant: "destructive",
      });
      return;
    }

    try {
      const returnData = {
        saleId: sale.id,
        shopId: sale.shopId, // Add shop ID from sale
        items: [
          {
            orderId: selectedProduct.id, // Move orderId to item level
            productId: selectedProduct.product_id,
            productName: selectedProduct.name,
            quantity: returnQuantity,
            price: selectedProduct.price,
            reason: formData.get('reason') as string
          }
        ],
        total: returnQuantity * selectedProduct.price,
        status: 'pending',
        customer: {
          id: sale.customer_id,// Use proper customer ID
          name: sale.customer?.first_name || 'Walking Customer',
        }
      };

      setIsProcessing(true);
      const response = await safeIpcInvoke<ReturnActionResponse>('entities:return:create', { returnData }, { success: false });

      if (response?.success && response.return) {
        toast({
          title: "Success",
          description: "Return created successfully",
        });
        setReturns(prev => [...prev, response.return as Return]);
        // Reset form
        setSale(null);
        setSelectedProduct(null);
        setReturnQuantity(0);
        setReturnAmount(0);
        setIsAddReturnOpen(false);
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
  const handleQuantityChange = (qty: number) => {
    if (selectedProduct && qty <= selectedProduct.quantity) {
      setReturnQuantity(qty);
      setReturnAmount(qty * selectedProduct.price);
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

  const handleEditClick = () => {
    if (selectedReturns.length === 1) {
      const returnToEdit = returns.find(returnItem => returnItem.id === selectedReturns[0])
      if (returnToEdit) {
        setEditingReturn(returnToEdit)
        setIsEditModalOpen(true)
      }
    }
  }

  const handleEditSave = (updatedReturn: Return) => {
    setReturns(returns.map(returnItem =>
      returnItem.id === updatedReturn.id ? updatedReturn : returnItem
    ))
    setEditingReturn(null)
    setIsEditModalOpen(false)
    setSelectedReturns([])
  }

  const handleDeleteClick = () => {
    if (selectedReturns.length > 0) {
      setReturnToDelete(selectedReturns[0])
      setIsDeleteModalOpen(true)
    }
  }

  const handleDeleteConfirm = () => {
    if (returnToDelete) {
      setReturns(returns.filter(returnItem => returnItem.id !== returnToDelete))
      setSelectedReturns(selectedReturns.filter(id => id !== returnToDelete))
      setReturnToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

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
        const result = await safeIpcInvoke<ReturnResponse>('entities:order:search', {
          searchTerm: value,
          shopId: localStorage.getItem('shopId') || ''
        });

        if (result?.success && result.suggestions) {
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
      const response = await safeIpcInvoke<SaleDetailsResponse>('entities:order:get-details', {
        orderId: suggestion.id,
      });

      if (response?.success && response.sale) {
        const order: Order = {
          id: response.sale?.id || '',
          customerName: response.sale?.customer?.first_name || 'Walking Customer',
          date: response.sale?.createdAt?.toISOString() || '',
          total: response.sale?.netAmount || 0,
          product: response.sale?.orders?.[0] ? {
            id: response.sale?.orders?.[0]?.product?.id || '',
            name: response.sale?.orders?.[0]?.product?.name || '',
            price: response.sale?.orders?.[0]?.sellingPrice || 0,
            quantity: response.sale?.orders?.[0]?.quantity || 0,
            total: (response.sale?.orders?.[0]?.quantity || 0) * (response.sale?.orders?.[0]?.sellingPrice || 0),
            product_id: response.sale?.orders?.[0]?.product?.id || ''
          } : {
            id: '',
            name: '',
            price: 0,
            quantity: 0,
            total: 0,
            product_id: ''
          },
        };

        setSelectedOrder(order);
        setSelectedProduct(null);
        setReturnQuantity(0);
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

  return (
    <div className="container mx-auto p-6">
      {returns.length === 0 && !isLoading ? (
        <EmptyState
          onCreateReturn={() => setIsAddReturnOpen(true)}
        />
      ) : (
        <>
          <Tabs defaultValue="returns" className="w-full space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Returns Management</h2>
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="returns">Returns List</TabsTrigger>
                <TabsTrigger value="add-return">Add Return</TabsTrigger>
              </TabsList>
            </div>

            {/* Returns List Tab */}
            <TabsContent value="returns">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-2xl font-bold">Returns List</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline">
                      <FileDown className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Section */}
                  <div className="flex items-center py-4">
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
                    <div className="relative ml-2" ref={searchRef}>
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
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick()}>
                                  <PenIcon className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick()}>
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                                {returnItem.status === 'pending' && (
                                  <Button variant="ghost" size="icon" onClick={() => handleApproveReturn(returnItem.id)}>
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                )}
                                {returnItem.status === 'pending' && (
                                  <Button variant="ghost" size="icon" onClick={() => handleRejectReturn(returnItem.id)}>
                                    <ArrowLeft className="h-4 w-4" />
                                  </Button>
                                )}
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add Return Tab */}
            <TabsContent value="add-return">
              <Card>
                <CardContent className="p-6">
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
                              <TableHead>Select</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Ordered Qty</TableHead>
                              <TableHead>Return Qty</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>
                                <input
                                  type="radio"
                                  checked={selectedProduct?.id === selectedOrder.product.id}
                                  onChange={() => setSelectedProduct(selectedOrder.product)}
                                />
                              </TableCell>
                              <TableCell>{selectedOrder.product.name}</TableCell>
                              <TableCell>{selectedOrder.product.price} XAF</TableCell>
                              <TableCell>{selectedOrder.product.quantity}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  max={selectedOrder.product.quantity}
                                  className="w-20"
                                  value={returnQuantity}
                                  onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                                  disabled={!selectedProduct}
                                />
                              </TableCell>
                              <TableCell>{returnAmount} XAF</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Return Details */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">Reason</Label>
                        <Select>
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
                          className="col-span-3"
                          placeholder="Additional details about the return..."
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="paymentMethod" className="text-right">Refund Method</Label>
                        <Select>
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
                      <Button type="submit">Process Return</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Return Detail Modal */}
          <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Return Details</DialogTitle>
              </DialogHeader>
              {selectedReturn && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Return ID</Label>
                      <p className="font-medium">{selectedReturn.id}</p>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <p className="font-medium">{selectedReturn.createdAt}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedReturn.status)}`}>
                        {selectedReturn.status}
                      </span>
                    </div>
                    <div>
                      <Label>Customer Name</Label>
                      <p className="font-medium">{selectedReturn.customer.name}</p>
                    </div>
                    <div className="col-span-2">
                      <Label>Reason</Label>
                      <p className="font-medium">{selectedReturn.items[0].reason}</p>
                    </div>
                  </div>
                </div>
              )}
              {sale && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sale ID</Label>
                      <p className="font-medium">{sale.id}</p>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <p className="font-medium">{sale.createdAt?.toString()}</p>
                    </div>
                    <div>
                      <Label>Total</Label>
                      <p className="font-medium">{sale.netAmount} XAF</p>
                    </div>
                    <div>
                      <Label>Customer Name</Label>
                      <p className="font-medium">{sale.customer?.first_name}</p>
                    </div>
                    <div className="col-span-2">
                      <Label>Products</Label>
                      <ul>
                        {sale?.orders?.map((order: any) => (
                          <li key={order.product.id}>
                            <p className="font-medium">{order.product.name}</p>
                            <p className="text-sm text-gray-500">Quantity: {order.quantity}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default Returns;
