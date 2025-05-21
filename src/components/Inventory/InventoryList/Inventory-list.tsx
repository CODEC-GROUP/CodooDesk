/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { PenIcon, TrashIcon, Plus, ArrowLeft } from 'lucide-react'
import { DeleteConfirmationModal } from '@/components/Shared/ui/Modal/delete-confrimation-modal'
import { Card, CardContent } from "@/components/Shared/ui/card"
import AddInventory  from '../add-inventory/add-inventory'
import InventoryDetails  from '../details/InventoryDetails'
import { LoadingSpinner } from "@/components/Shared/ui/LoadingSpinner"
import { ErrorAlert } from "@/components/Shared/ui/ErrorAlert"
import { useToast } from "@/components/Shared/ui/use-toast"

interface ProductDetails {
  name: string;
  sku: string;
  description: string;
  category: string;
  reorderPoint?: number;
}

interface InventoryItem {
  id: string;
  product: ProductDetails;
  quantity: number;
  unit_cost: number;
  selling_price: number;
  last_restock_date: Date;
  supplier_name?: string;
  qty_supplied?: number;
  sold?: number;
  returned_shop?: number;
  returned_supplier?: number;
  qty_left?: number;
  amount?: number;
}

const DUMMY_INVENTORY: InventoryItem[] = [
  {
    id: 'inv001',
    product: {
      name: 'Sample Product',
      sku: 'SKU001',
      description: 'A sample product',
      category: 'Category A',
      reorderPoint: 10,
    },
    quantity: 100,
    unit_cost: 1000,
    selling_price: 1500,
    last_restock_date: new Date(),
    supplier_name: 'Supplier A',
    qty_supplied: 120,
    sold: 15,
    returned_shop: 2,
    returned_supplier: 1,
    qty_left: 102,
    amount: 153000,
  },
  {
    id: 'inv002',
    product: {
      name: 'Another Product',
      sku: 'SKU002',
      description: 'Another sample',
      category: 'Category B',
      reorderPoint: 5,
    },
    quantity: 50,
    unit_cost: 2000,
    selling_price: 2500,
    last_restock_date: new Date(),
    supplier_name: 'Supplier B',
    qty_supplied: 60,
    sold: 5,
    returned_shop: 0,
    returned_supplier: 0,
    qty_left: 55,
    amount: 137500,
  },
];

export function InventoryList({ onBack }: { onBack: () => void }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(DUMMY_INVENTORY)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showAddInventory, setShowAddInventory] = useState(false)
  const { toast } = useToast()

  const getStatusBadgeColor = (quantity: number, reorderPoint?: number) => {
    if (quantity > (reorderPoint ?? 0)) return 'bg-green-100 text-green-800';
    if (quantity > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const calculateTotalValue = (quantity: number, sellingPrice: number) => {
    return (quantity * sellingPrice).toLocaleString() + ' FCFA';
  };

  if (selectedItem) {
    return (
      <InventoryDetails
        item={selectedItem as any}
        onBack={() => setSelectedItem(null)}
        onItemUpdated={(updatedItem) => {
          setInventory(prev => prev.map(item =>
            item.id === updatedItem.id ? updatedItem : item
          ));
          setSelectedItem(null);
        }}
      />
    );
  }

  if (showAddInventory) {
    return <AddInventory 
      onBack={() => setShowAddInventory(false)} 
      warehouseId={''}
      onSuccess={() => setShowAddInventory(false)}
      parentView="inventory"
    />
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
          Product Inventory
        </h1>
        <div className="space-x-2">
          {selectedItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Delete Selected ({selectedItems.length})
            </Button>
          )}
          {!productId && (
            <Button onClick={() => setShowAddInventory(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          )}
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
                  <TableHead>Inv #</TableHead>
                  <TableHead>Qty Supplied</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Returned (Shop)</TableHead>
                  <TableHead>Returned (Supplier)</TableHead>
                  <TableHead>Qty Left</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-10">
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
                      <TableCell>{item.id.substring(0, 8)}</TableCell>
                      <TableCell>{item.qty_supplied ?? item.quantity}</TableCell>
                      <TableCell>{item.supplier_name || 'N/A'}</TableCell>
                      <TableCell>{item.unit_cost.toLocaleString()} FCFA</TableCell>
                      <TableCell>{item.selling_price.toLocaleString()} FCFA</TableCell>
                      <TableCell>{item.sold ?? 0}</TableCell>
                      <TableCell>{item.returned_shop ?? 0}</TableCell>
                      <TableCell>{item.returned_supplier ?? 0}</TableCell>
                      <TableCell>{item.qty_left ?? item.quantity}</TableCell>
                      <TableCell>{((item.qty_left ?? item.quantity) * item.selling_price).toLocaleString()} FCFA</TableCell>
                      <TableCell>{item.last_restock_date ? new Date(item.last_restock_date).toLocaleDateString() : 'N/A'}</TableCell>
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
      <DeleteConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!itemToDelete) return;
          setInventory(prev => prev.filter(item => item.id !== itemToDelete));
          setSelectedItems(prev => prev.filter(id => id !== itemToDelete));
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        title="Delete Inventory Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
      />
    </div>
  )
}
