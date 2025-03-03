/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
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
import { PenIcon, TrashIcon, FileDown, Plus, Search, Package } from 'lucide-react'
import { ConfirmationDialog } from '@/components/Shared/ui/Modal/confirmation-dialog'
import { Card, CardContent } from "@/components/Shared/ui/card"
import AddWarehouse from '../Form/AddWarehouse'
import { InventoryList } from '@/components/Inventory/InventoryList/Inventory-list'
import { useAppTranslation } from '@/hooks/useAppTranslation'
import { safeIpcInvoke } from '@/lib/ipc'
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'
import { LoadingSpinner } from '@/components/Shared/ui/LoadingSpinner'
import { ErrorAlert } from '@/components/Shared/ui/ErrorAlert'
import { toast } from '@/hooks/use-toast'
import EditWarehouse from '../Form/EditWarehouse'

interface WarehouseItem {
  id: string
  name: string
  level: number
  value: number
  status: 'Low' | 'Medium' | 'High'
  description?: string
  shopId: string | null
}

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function WarehouseList() {
  const { business, currentShopId, user } = useAuthLayout()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showAddWarehouse, setShowAddWarehouse] = useState(false)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [editWarehouse, setEditWarehouse] = useState<WarehouseItem | null>(null)

  const statusLabels = {
    Low: 'Low',
    Medium: 'Medium',
    High: 'High'
  }

  const fetchWarehouses = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await safeIpcInvoke<{
        success: boolean
        data: {
          items: WarehouseItem[]
          pagination: PaginationState
        }
        message?: string
      }>('inventory:get-by-shop', {
        shopId: currentShopId,
        isAdmin: user?.role === 'admin' || user?.role === 'shop_owner',
        pagination: {
          page: pagination.page,
          limit: pagination.limit
        }
      })

      if (response?.success) {
        setWarehouses(response.data.items)
        setPagination(response.data.pagination)
      } else {
        throw new Error(response?.message || 'Failed to fetch warehouses')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch warehouses'
      setError(message)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouses()
  }, [pagination.page, pagination.limit, currentShopId])

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return

    try {
      setIsDeleting(true)
      const response = await safeIpcInvoke<{ success: boolean }>(
        'inventory:delete', 
        { id: deleteId }
      )
      
      if (response?.success) {
        setWarehouses(prev => prev.filter(w => w.id !== deleteId))
        setSelectedItems(prev => prev.filter(id => id !== deleteId))
        toast({ title: 'Success', description: 'Warehouse deleted' })
      }
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return

    try {
      setIsDeleting(true)
      const results = await Promise.all(
        selectedItems.map(id =>
          safeIpcInvoke<{ success: boolean }>('inventory:delete', { id })
        )
      )

      const failedDeletions = results.filter(r => r && !r.success)
      if (failedDeletions.length === 0) {
        setWarehouses(prev => prev.filter(item => !selectedItems.includes(item.id)))
        setSelectedItems([])
        toast({
          title: 'Success',
          description: 'Selected warehouses deleted successfully'
        })
      } else {
        throw new Error(`Failed to delete ${failedDeletions.length} warehouses`)
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete warehouses'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddItemClick = () => {
    setShowAddWarehouse(true)
  }

  const handleBackToList = () => {
    setShowAddWarehouse(false)
    fetchWarehouses() // Refresh the list after adding
  }

  const handleEditClick = (id: string) => {
    const warehouse = warehouses.find(w => w.id === id)
    if (warehouse) setEditWarehouse(warehouse)
  }

  if (selectedWarehouseId) {
    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
    return <InventoryList 
      warehouseId={selectedWarehouseId} 
      warehouseName={selectedWarehouse?.name || 'Warehouse'}
      onBack={() => setSelectedWarehouseId(null)}
      parentView="warehouse"
    />
  }

  if (editWarehouse) {
    return <EditWarehouse 
      warehouse={{
        ...editWarehouse,
        description: editWarehouse.description || ''
      }}
      onBack={() => {
        setEditWarehouse(null)
        fetchWarehouses()
      }} 
    />
  }

  if (showAddWarehouse) {
    return <AddWarehouse onBack={handleBackToList} />
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Warehouse Management</h1>
        <div className="space-x-2">
          {selectedItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : `Delete Selected (${selectedItems.length})`}
            </Button>
          )}
          <Button onClick={handleAddItemClick}>
            <Plus className="mr-2 h-4 w-4" /> Add New Warehouse
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length === warehouses.length && warehouses.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(warehouses.map(w => w.id))
                        } else {
                          setSelectedItems([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <LoadingSpinner />
                    </TableCell>
                  </TableRow>
                ) : warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      No warehouses found
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((warehouse) => (
                    <TableRow 
                      key={warehouse.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedWarehouseId(warehouse.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedItems.includes(warehouse.id)}
                          onCheckedChange={() => toggleItemSelection(warehouse.id)}
                        />
                      </TableCell>
                      <TableCell>{warehouse.name}</TableCell>
                      <TableCell>{statusLabels[warehouse.status]}</TableCell>
                      <TableCell>{warehouse.level}</TableCell>
                      <TableCell>{warehouse.value}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(warehouse.id)}
                        >
                          <PenIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(warehouse.id)}
                          disabled={isDeleting}
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

      {/* Pagination */}
      {!loading && warehouses.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
            <Select
              value={pagination.limit.toString()}
              onValueChange={(value) =>
                setPagination(prev => ({ ...prev, page: 1, limit: parseInt(value) }))
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </span>
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Warehouse"
        description="Are you sure you want to delete this warehouse? This action cannot be undone."
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  )
}
