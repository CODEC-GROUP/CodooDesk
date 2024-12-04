/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
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

// Mock data for dropdowns
const customers: Customer[] = [
  { id: "1", name: "Aurelie Mballa", phone: "237670000001" },
  { id: "2", name: "Jean-Claude Ndombe", phone: "237670000002" },
];

const orders: Order[] = [
  { 
    id: "ORD-001", 
    customerName: "Aurelie Mballa",
    date: "2024-01-15",
    total: 15000,
    product: {
      id: "1",
      name: "Product A",
      price: 1000,
      quantity: 2,
      total: 2000,
      product_id: "1"
    }
  },
  { 
    id: "ORD-002",
    customerName: "Jean-Claude Ndombe",
    date: "2024-01-16",
    total: 25000,
    product: {
      id: "2",
      name: "Product B",
      price: 2000,
      quantity: 1,
      total: 2000,
      product_id: "2"
    }
  },
];

// Mock data for initial returns
const initialReturns: Return[] = [
  {
    id: "RET-001",
    orderId: "ORD-001",
    items: [
      {
        id: "1",
        productId: "1",
        productName: "Product A",
        quantity: 1,
        price: 1000,
        reason: "Defective Product"
      }
    ],
    total: 1000,
    status: "pending",
    createdAt: "2024-01-15",
    customer: {
      id: "1",
      name: "Aurelie Mballa"
    }
  },
  {
    id: "RET-002",
    orderId: "ORD-002",
    items: [
      {
        id: "2",
        productId: "2",
        productName: "Product B",
        quantity: 2,
        price: 2000,
        reason: "Wrong Size"
      }
    ],
    total: 4000,
    status: "approved",
    createdAt: "2024-01-16",
    customer: {
      id: "2",
      name: "Jean-Claude Ndombe"
    }
  },
  {
    id: "RET-003",
    orderId: "ORD-003",
    items: [
      {
        id: "3",
        productId: "3",
        productName: "Product C",
        quantity: 1,
        price: 3000,
        reason: "Not as Described"
      }
    ],
    total: 3000,
    status: "rejected",
    createdAt: "2024-01-17",
    customer: {
      id: "3",
      name: "Marie Kouassi"
    }
  }
];

const Returns = () => {
  const [returns, setReturns] = useState(initialReturns)
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
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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
      const response = await safeIpcInvoke<ReturnResponse>('returns:get-all', {}, {
        success: false,
        returns: []
      });

      if (response?.success && response.returns) {
        setReturns(response.returns);
      } else {
        toast({
          title: "Error",
          description: "Failed to load returns",
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
    
    if (!selectedOrder || !selectedProduct || !returnQuantity) {
      // Add error notification here
      return;
    }

    try {
      const returnData = {
        orderId: selectedOrder.id,
        items: [
          {
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
          id: selectedOrder.customerName,
          name: selectedOrder.customerName
        }
      };

      const response = await safeIpcInvoke<ReturnActionResponse>('returns:create', { returnData }, { success: false });
      
      if (response?.success && response.return) {
        setReturns(prev => [...prev, response.return as Return]);
        // Reset form
        setSelectedOrder(null);
        setSelectedProduct(null);
        setReturnQuantity(0);
        setReturnAmount(0);
      }
    } catch (error) {
      console.error('Error creating return:', error);
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

  return (
    <div className="container mx-auto p-6">
      {returns.length === 0 && !isLoading ? (
        <EmptyState onCreateReturn={() => {}} />
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
                    <div className="relative ml-2">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search returns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
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
                            <TableCell>{returnItem.total.toLocaleString()} XAF</TableCell>
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
                    {/* Customer Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="customer" className="text-right">Customer</Label>
                      <div className="col-span-3">
                        <Select 
                          onValueChange={(value) => {
                            const customer = customers.find(c => c.id === value);
                            setSelectedCustomer(customer || null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} - {customer.phone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="order" className="text-right">Order</Label>
                      <div className="col-span-3">
                        <Select 
                          onValueChange={(value) => {
                            const order = orders.find(o => o.id === value);
                            setSelectedOrder(order || null);
                            setSelectedProduct(null);
                            setReturnQuantity(0);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select order" />
                          </SelectTrigger>
                          <SelectContent>
                            {orders.map((order) => (
                              <SelectItem key={order.id} value={order.id}>
                                {order.id} - {order.customerName} - {order.total} XAF
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
