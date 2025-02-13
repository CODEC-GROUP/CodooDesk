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
}

export function InventoryList({ warehouseId, onBack }: InventoryListProps) {
  const [inventory, setInventory] = useState<InventoryItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithDetails | null>(null)
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    sku: true,
    category: true,
    quantity: true,
    unitPrice: true,
    sellingPrice: true,
    totalValue: true,
    supplier: true,
    status: true,
    productsSold: true,
    productsLeft: true,
    returnsToShop: true,
    returnsToSupplier: true
  });
  const { toast } = useToast()

  useEffect(() => {
    fetchInventory();
  }, [warehouseId]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await safeIpcInvoke<InventoryItemResponse>(
        'inventory:items:get-by-inventory',
        {
          inventoryId: warehouseId
        },
        { success: false }
      );

      if (response?.success && response.items) {
        setInventory(response.items);
      } else {
        setError(response?.message || 'Failed to fetch inventory data');
        toast({
          variant: "destructive",
          title: "Error",
          description: response?.message || "Failed to fetch inventory"
        });
      }
    } catch (err) {
      setError('Failed to fetch inventory data');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch inventory data"
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      setInventory(inventory.filter(item => item.id !== itemToDelete))
      setSelectedItems(selectedItems.filter(id => id !== itemToDelete))
      setIsDeleteModalOpen(false)
      setItemToDelete(null)
    }
  }

  const openOverlay = (item: InventoryItemWithDetails) => {
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

  if (showAddInventory) {
    return <AddInventory onBack={handleBackToList} />
  }

  if (selectedItem) {
    return <InventoryDetails 
      item={{
        id: selectedItem.id,
        name: selectedItem.product.name,
        sku: selectedItem.product.sku,
        category: selectedItem.product.category || 'default',
        quantity: selectedItem.quantity,
        unitPrice: selectedItem.unit_cost,
        sellingPrice: selectedItem.selling_price,
        totalValue: selectedItem.total_value,
        supplier: selectedItem.supplier.name,
        status: selectedItem.status === 'in_stock' ? 'In Stock' :
               selectedItem.status === 'low_stock' ? 'Low Stock' : 'Out of Stock',
        lastUpdated: selectedItem.last_restock_date?.toISOString() || new Date().toISOString(),
        description: selectedItem.product.description || 'No description available',
        productsSold: selectedItem.sales_data?.total_sold || 0,
        productsLeft: selectedItem.quantity,
        returnsToShop: 0,
        returnsToSupplier: 0
      }} 
      onClose={closeOverlay} 
    />
  }

  return (
    <div className="container mx-auto p-6">
      <div className="md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Last Restocked</TableHead>
                <TableHead>Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.product.sku}</TableCell>
                  <TableCell>
                    <Badge variant={
                      item.status === 'in_stock' ? 'default' :
                      item.status === 'low_stock' ? 'secondary' : 'destructive'
                    }>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.reorder_point}</TableCell>
                  <TableCell>{item.unit_cost}</TableCell>
                  <TableCell>{item.selling_price}</TableCell>
                  <TableCell>{item.total_value}</TableCell>
                  <TableCell>{item.last_restock_date ? item.last_restock_date.toISOString().split('T')[0] : 'N/A'}</TableCell>
                  <TableCell>{item.supplier.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {inventory.map((item) => (
          <Card key={item.id} className="mb-4">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{item.product.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                </div>
                <Badge variant={
                  item.status === 'in_stock' ? 'default' :
                  item.status === 'low_stock' ? 'secondary' : 'destructive'
                }>
                  {item.status}
                </Badge>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Quantity</span>
                  <span className="text-sm">{item.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Selling Price</span>
                  <span className="text-sm">{item.selling_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Value</span>
                  <span className="text-sm">{item.total_value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Supplier</span>
                  <span className="text-sm">{item.supplier.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}
    </div>
  )
}
