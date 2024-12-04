"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { ArrowLeft } from "lucide-react"
import { useRouter } from 'next/navigation'

// Mock function to fetch product details
const fetchProductDetails = async (id: string) => {
  // In a real application, this would be an API call
  return {
    id,
    name: "Laptop Model A",
    sku: "LAP001A",
    category: "Electronics",
    quantity: 50,
    unitType: "piece",
    purchasePrice: 800,
    sellingPrice: 1200,
    suppliers: ["Supplier A", "Supplier B"],
    dateAdded: "2023-05-15",
    status: "In stock"
  }
}

// Define the type for product details
type ProductDetails = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitType: string;
  purchasePrice: number;
  sellingPrice: number;
  suppliers: string[];
  dateAdded: string;
  status: string;
};

interface Product {
    id: string;
    name: string;
    sku: string; // Add this line
    category: string; // Add this line
    quantity: number; // Already added
    unitType: string; // Add this line
    purchasePrice: number; // Add this line
    sellingPrice: number; // Already added
    suppliers: string[]; // Add this line
    dateAdded?: string; // Already added
    status: string; // Add this line

    // ... other properties ...
}

export const InventoryItemDetails: React.FC<{ product: Product }> = ({ product }) => {
  const [ /* eslint-disable @typescript-eslint/no-unused-vars */
    productDetails, setProductDetails] = useState<ProductDetails | null>(null); // Update the state initialization
  const router = useRouter()

  useEffect(() => {
    fetchProductDetails(product.id).then(setProductDetails); // Use setProductDetails instead
  }, [product.id])

  if (!product) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Inventory List
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>View and edit details for {product.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" value={product.name} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={product.sku} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={product.category} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" value={product.quantity} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitType">Unit Type</Label>
              <Input id="unitType" value={product.unitType} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price (XAF)</Label>
              <Input id="purchasePrice" value={product.purchasePrice} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (XAF)</Label>
              <Input id="sellingPrice" value={product.sellingPrice} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input id="status" value={product.status} readOnly />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="suppliers">Suppliers</Label>
            <Input id="suppliers" value={product.suppliers.join(", ")} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateAdded">Date Added</Label>
            <Input id="dateAdded" value={product.dateAdded} readOnly />
          </div>
        </CardContent>
        <CardFooter>
          <Button>Edit Product</Button>
        </CardFooter>
      </Card>
    </div>
  )
}