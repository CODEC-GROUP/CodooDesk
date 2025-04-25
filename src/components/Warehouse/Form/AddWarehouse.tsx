"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from '@/hooks/use-toast'
import { safeIpcInvoke } from "@/lib/ipc"
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { InventoryAttributes } from "@/models/Inventory"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem
} from "@/components/ui/command"

interface AddWarehouseProps {
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  sku: string;
  status?: string;
}

interface ProductResponse {
  success: boolean;
  products?: Product[];
  message?: string;
}

const AddWarehouse: React.FC<AddWarehouseProps> = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Medium" as "Low" | "Medium" | "High",
    level: 0,
    value: 0
  })
  const { business, currentShopId } = useAuthLayout()
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isProductSearchFocused, setIsProductSearchFocused] = useState(false)

  // Get shop IDs based on user role
  const shopIds = business?.shops?.map(shop => shop.id) || []

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      
      const response = await safeIpcInvoke<ProductResponse>('inventory:product:get-all-with-inventories', {
        shopIds,
        businessId: business?.id,
        includeInventories: true
      }, {
        success: false,
        products: []
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch products')
      }

      setProducts(response.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({
        title: "Error",
        description: "Failed to load products. Please try refreshing the page.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddWarehouse = async () => {
    try {
      setIsLoading(true)
      
      if (!formData.name.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Warehouse name is required'
        });
        return;
      }

      const response = await safeIpcInvoke<{ 
        success: boolean; 
        data: InventoryAttributes;
        message?: string 
      }>('inventory:create', {
        name: formData.name.trim(),
        description: formData.description.trim(),
        shopId: currentShopId || business?.shops?.[0]?.id || null,
        level: formData.level,
        value: formData.value,
        status: formData.status
      });

      if (response?.success) {
        toast({ 
          title: 'Success', 
          description: 'Warehouse created successfully'
        });
        onBack();
      } else {
        throw new Error(response?.message || 'Failed to create warehouse');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create warehouse'
      });
    } finally {
      setIsLoading(false)
    }
  };

  const filteredProducts = searchTerm
    ? products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
      p.status !== 'out_of_stock'
    ).slice(0, 6) // Limit to 6 suggestions
    : [];

  // Function to highlight matching text in search results
  const highlightMatchingText = (text: string, query: string) => {
    if (!query) return text;
    
    try {
      const regex = new RegExp(`(${query})`, 'gi');
      const parts = text.split(regex);
      
      return (
        <>
          {parts.map((part, i) => 
            regex.test(part) ? 
              <span key={i} className="bg-yellow-100">{part}</span> : 
              <span key={i}>{part}</span>
          )}
        </>
      );
    } catch (e) {
      // If regex fails (e.g., with special characters), return the original text
      return text;
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm("");
    setIsProductSearchFocused(false);
    
    // Automatically set the warehouse name to the product name
    handleInputChange('name', product.name);
  };

  return (
    <div className="container mx-auto py-10">
      <Button 
        onClick={onBack} 
        variant="outline" 
        className="mb-4"
        disabled={isLoading}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Warehouse</CardTitle>
          <CardDescription>Create a new warehouse to track your inventory</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product-search">Select Product</Label>
            <Popover open={isProductSearchFocused} onOpenChange={setIsProductSearchFocused}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isProductSearchFocused}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  {selectedProduct ? selectedProduct.name : "Select a product..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search products..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    onFocus={() => setIsProductSearchFocused(true)}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandGroup>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={product.id}
                            onSelect={() => handleSelectProduct(product)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {highlightMatchingText(product.name, searchTerm)}
                              </span>
                              <span className="text-xs text-gray-500">
                                SKU: {product.sku} | Price: ${product.sellingPrice.toFixed(2)} | Qty: {product.quantity}
                              </span>
                            </div>
                          </CommandItem>
                        ))
                      ) : (
                        <CommandItem disabled>No products found</CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse-name">Warehouse Name</Label>
            <Input
              id="warehouse-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter warehouse name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Input
              id="status"
              value="Medium"
              disabled={true}
              className="bg-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                type="number"
                min="0"
                value={0}
                disabled={true}
                className="bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                min="0"
                value={0}
                disabled={true}
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter warehouse description"
              disabled={isLoading}
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleAddWarehouse} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Warehouse...' : 'Create Warehouse'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddWarehouse
