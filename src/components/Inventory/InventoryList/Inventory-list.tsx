/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { PenIcon, TrashIcon, FileDown, Plus, Search, ArrowLeft, Settings2 } from 'lucide-react'
import { DeleteConfirmationModal } from '@/components/Shared/ui/Modal/delete-confrimation-modal'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Shared/ui/dialog"
import AddInventory  from '../add-inventory/add-inventory'
import InventoryDetails  from '../details/InventoryDetails'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/Shared/ui/dropdown-menu"
import { Badge } from "@/components/Shared/ui/badge"
import { LoadingSpinner } from "@/components/Shared/ui/LoadingSpinner"
import { ErrorAlert } from "@/components/Shared/ui/ErrorAlert"
import { InventoryItemResponse, InventoryItemWithDetails } from "@/types/inventory"
import { useToast } from "@/components/Shared/ui/use-toast"
import { safeIpcInvoke } from "@/lib/ipc"

interface InventoryListProps {
  warehouseId: string;
  onBack: () => void;
  warehouseName: string;
  parentView?: 'inventory' | 'warehouse';
}

interface ProductDetails {
  name: string;
  sku: string;
  description: string;
  category: string;
  reorderPoint: number;
}

interface InventoryItemWithProduct extends InventoryItemWithDetails {
  product: ProductDetails;
}

export function InventoryList({ warehouseId, onBack, warehouseName, parentView = 'warehouse' }: InventoryListProps) {
  const [inventory, setInventory] = useState<InventoryItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithProduct | null>(null)
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    sku: true,
    category: true,
    quantity: true,
    unitPrice: true,
    sellingPrice: true,
    totalValue: true,
    status: true,
    productsSold: true,
    productsLeft: true,
    returnsToShop: true,
    returnsToSupplier: true
  });
  const { toast } = useToast()
  const [totalItems, setTotalItems] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await safeIpcInvoke<{ items: InventoryItemWithProduct[], totalItems: number, totalValue: number }>(
        'inventory:item:get-all-by-inventory-id',
        { inventoryId: warehouseId },
        { items: [], totalItems: 0, totalValue: 0 }
      );
      
      if (data) {
        setInventory(Array.isArray(data.items) ? data.items : []);
        setTotalItems(data.totalItems);
        setTotalValue(data.totalValue);
      } else {
        setInventory([]);
        setTotalItems(0);
        setTotalValue(0);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
      setInventory([]);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load inventory items. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [warehouseId, refreshTrigger]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleDeleteClick = () => {
    if (selectedItems.length > 0) {
      setItemToDelete(selectedItems[0])
      setIsDeleteModalOpen(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const success = await safeIpcInvoke<boolean>(
        'inventory:item:delete',
        { id: itemToDelete },
        false
      );

      if (success) {
        setInventory(prev => prev.filter(item => item.id !== itemToDelete));
        setSelectedItems(prev => prev.filter(id => id !== itemToDelete));
        toast({ title: 'Success', description: 'Item deleted successfully' });
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete item'
      });
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const openOverlay = (item: InventoryItemWithProduct) => {
    setSelectedItem(item);
  }

  const closeOverlay = () => {
    setSelectedItem(null);
  }

  const handleAddItemClick = () => {
    setShowAddInventory(true)
  }

  const handleBackToList = () => {
    setShowAddInventory(false)
  }

  const handleAddItemSuccess = () => {
    setShowAddInventory(false);
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: 'Success',
      description: 'Item added successfully'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'low_stock':
        return 'bg-red-100 text-red-800';
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalValue = (quantity: number, sellingPrice: number) => {
    return (quantity * sellingPrice).toLocaleString() + ' FCFA';
  };

  if (selectedItem) {
    return (
      <InventoryDetails
        item={selectedItem}
        onBack={() => setSelectedItem(null)}
        onItemUpdated={(updatedItem) => {
          setInventory(prev => prev.map(item => 
            item.id === updatedItem.id ? updatedItem as InventoryItemWithProduct : item
          ));
          setSelectedItem(null);
        }}
      />
    );
  }

  if (showAddInventory) {
    return <AddInventory 
      onBack={handleBackToList} 
      warehouseId={warehouseId}
      onSuccess={handleAddItemSuccess}
      parentView="inventory"
    />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <ErrorAlert 
          message={error}
          title="Failed to Load Inventory"
          retry={loadInventory}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold flex-1">
          {warehouseName} - Inventory Items
        </h1>
        <div className="text-sm text-gray-500">
          Total Items: {totalItems} | Total Value: {totalValue.toLocaleString()} FCFA
        </div>
        <div className="space-x-2">
          {selectedItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={loading}
            >
              Delete Selected ({selectedItems.length})
            </Button>
          )}
          <Button onClick={() => setShowAddInventory(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length === inventory.length && inventory.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(inventory.map(item => item.id))
                        } else {
                          setSelectedItems([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reorder Point</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Last Restocked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10">
                      <LoadingSpinner />
                    </TableCell>
                  </TableRow>
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedItem(item)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => {
                            setSelectedItems(prev => 
                              prev.includes(item.id)
                                ? prev.filter(id => id !== item.id)
                                : [...prev, item.id]
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>{item.product.sku}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(
                          item.quantity > item.product.reorderPoint ? 'in_stock' :
                          item.quantity > 0 ? 'low_stock' : 'out_of_stock'
                        )}`}>
                          {(item.quantity > item.product.reorderPoint ? 'In Stock' :
                           item.quantity > 0 ? 'Low Stock' : 'Out of Stock')}
                        </span>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.product.reorderPoint}</TableCell>
                      <TableCell>{item.unit_cost.toLocaleString()} FCFA</TableCell>
                      <TableCell>{item.selling_price.toLocaleString()} FCFA</TableCell>
                      <TableCell>{calculateTotalValue(item.quantity, item.selling_price)}</TableCell>
                      <TableCell>{item.last_restock_date ? item.last_restock_date.toISOString().split('T')[0] : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                        >
                          <PenIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item.id);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile View */}
      <div className="md:hidden">
        {inventory.length === 0 ? (
          <p className="text-center py-8">No inventory items found</p>
        ) : (
          inventory.map((item) => (
            <Card key={item.id} className="mb-4">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(
                    item.quantity > item.product.reorderPoint ? 'in_stock' :
                    item.quantity > 0 ? 'low_stock' : 'out_of_stock'
                  )}`}>
                    {(item.quantity > item.product.reorderPoint ? 'In Stock' :
                     item.quantity > 0 ? 'Low Stock' : 'Out of Stock')}
                  </span>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Quantity</span>
                    <span className="text-sm">{item.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Selling Price</span>
                    <span className="text-sm">{item.selling_price.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Value</span>
                    <span className="text-sm">{calculateTotalValue(item.quantity, item.selling_price)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="destructive"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={loading}
          >
            Delete Selected ({selectedItems.length})
          </Button>
        </div>
      )}
    </div>
  )
}
