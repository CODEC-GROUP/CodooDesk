'use client'

import React, { useState } from 'react'
import { Button } from "@/components/Shared/ui/button"
import {
  Table,
  TableBody,
  //TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
//import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Shared/ui/tabs"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { ArrowLeft, Save, Plus, Minus } from "lucide-react"
import { StockMovementTable } from "@/components/Inventory/stock-movement/StockMovementTable"

type InventoryItem = {
  id: string
  name: string
  sku: string
  description: string
  category: string
  quantity: number
  unitPrice: number
  totalValue: number
  supplier: string
  lastUpdated: string
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  sellingPrice: number
}

const mockInventoryItem: InventoryItem = {
  id: '1',
  name: 'Wireless Bluetooth Headphones',
  sku: 'SKU001',
  description: 'High-quality wireless headphones with noise-cancelling technology',
  category: 'Electronics',
  quantity: 100,
  unitPrice: 79.99,
  totalValue: 7999,
  supplier: 'TechAudio Inc.',
  lastUpdated: '2023-06-15',
  status: 'In Stock',
  sellingPrice: 79.99
}

interface InventoryDetailsProps {
  item: {
    sellingPrice: number;
    id: string
    name: string
    sku: string
    description: string
    category: string
    quantity: number
    unitPrice: number
    totalValue: number
    supplier: string
    lastUpdated: string
    status: 'In Stock' | 'Low Stock' | 'Out of Stock'
    productsSold?: number
    productsLeft?: number
    returnsToShop?: number
    returnsToSupplier?: number
  };
  onClose: () => void;
}

const InventoryDetails: React.FC<InventoryDetailsProps> = ({ item, onClose }) => {
  const [itemState, setItemState] = useState<InventoryItem>(item)
  const [movementType, setMovementType] = useState<'Added' | 'Removed'>('Added')
  const [movementQuantity, setMovementQuantity] = useState<number>(0)
  const [movementReason, setMovementReason] = useState<string>('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'quantity') {
      setItemState(prevItem => ({ ...prevItem, [name]: Number(value) }))
    } else {
      setItemState(prevItem => ({ ...prevItem, [name]: value }))
    }
  }

  const handleSave = () => {
    // Implement save logic here
    console.log('Saving item:', itemState)
  }

  const handleStockAdjustment = (adjustment: number) => {
    setItemState(prevItem => ({
      ...prevItem,
      quantity: prevItem.quantity + adjustment,
      totalValue: (prevItem.quantity + adjustment) * prevItem.unitPrice
    }))
  }

  const handlePerformMovement = () => {
    const adjustment = movementType === 'Added' ? movementQuantity : -movementQuantity
    handleStockAdjustment(adjustment)
    console.log('Performed movement:', { movementType, movementQuantity, movementReason })
    // Reset form fields
    setMovementQuantity(0)
    setMovementReason('')
  }

  return (
    <div className="container mx-auto py-10">
      <Button variant="ghost" className="mb-4" onClick={onClose}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Inventory List
      </Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Item Details</h1>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="stock">Stock Movements</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" value={itemState.sku} readOnly className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" value={itemState.name} readOnly className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={itemState.category} disabled>
                    <SelectTrigger className="bg-gray-100">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Clothing">Clothing</SelectItem>
                      <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input id="supplier" name="supplier" value={itemState.supplier} readOnly className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price (XAF)</Label>
                  <Input id="unitPrice" name="unitPrice" type="number" value={itemState.unitPrice} readOnly className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <div className="flex items-center space-x-2">
                    <Input id="quantity" name="quantity" type="number" value={itemState.quantity} onChange={handleInputChange} />
                    <Button size="sm" onClick={() => handleStockAdjustment(1)}><Plus className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => handleStockAdjustment(-1)}><Minus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={itemState.description} readOnly className="bg-gray-100" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stock">
          <StockMovementTable inventoryId={item.id} />
        </TabsContent>
      </Tabs>
      <button onClick={onClose}>Close</button>
    </div>
  )
}

export default InventoryDetails
