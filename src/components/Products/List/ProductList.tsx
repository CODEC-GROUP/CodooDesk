'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { ListFilter, Pencil, Trash2, AlertCircle } from "lucide-react"
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import type { ProductAttributes } from "@/models/Product";
import type { CategoryAttributes } from "@/models/Category";
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from '../Empty/EmptyState'

interface ProductListProps {
  onProductClick: (product: ProductAttributes) => void;
  onAddProduct: () => void;
}

interface ProductResponse {
  success: boolean;
  products?: ProductAttributes[];
  message?: string;
}

interface CategoryResponse {
  success: boolean;
  categories?: CategoryAttributes[];
  message?: string;
}

export function ProductList({ onProductClick, onAddProduct }: ProductListProps) {
  const { business } = useAuthLayout();
  const [products, setProducts] = useState<ProductAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [selectedShops, setSelectedShops] = useState<string[]>([]);

  // Initialize data when business loads
  useEffect(() => {
    const initializeData = async () => {
      if (!business) {
        return; // Wait for business to be loaded
      }

      try {
        // Get shop IDs directly
        const shopIds = business.shops
          ?.filter((shop: any) => shop?.dataValues?.id)
          .map((shop: any) => shop.dataValues.id) || [];

        // Proceed with API call
        const response = await safeIpcInvoke<ProductResponse>('inventory:product:get-all', {
          shopIds,
          businessId: business.id
        }, {
          success: false,
          products: []
        });

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to fetch products');
        }

        setProducts(response.products || []);

        // Fetch categories
        const categoryResponse = await safeIpcInvoke<CategoryResponse>('inventory:category:get-all', {
          businessId: business.id
        }, {
          success: false,
          categories: []
        });

        if (categoryResponse?.success && categoryResponse.categories) {
          const categoryMap = categoryResponse.categories.reduce((acc, cat) => ({
            ...acc,
            [cat.id]: cat.name
          }), {});
          setCategories(categoryMap);
        }

      } catch (error) {
        console.error('Error initializing data:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize product data');
        toast({
          title: "Error",
          description: "Failed to load products. Please try refreshing the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    initializeData();
  }, [business]);

  // Handle shop selection changes
  const handleShopSelection = async (shopId: string, checked: boolean | string) => {
    try {
      const newSelection = checked === true
        ? [...selectedShops, shopId]
        : selectedShops.filter(id => id !== shopId);

      console.log('Updating shop selection:', newSelection);
      setSelectedShops(newSelection);

      if (newSelection.length === 0) {
        setProducts([]);
        return;
      }

      setIsLoading(true);

      const response = await safeIpcInvoke<ProductResponse>('inventory:product:get-all', {
        shopIds: newSelection,
        businessId: business?.id
      }, {
        success: false,
        products: []
      });

      if (response?.success && response.products) {
        setProducts(response.products);
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to fetch products',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating shop selection:', error);
      toast({
        title: "Error",
        description: 'Failed to update shop selection',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await safeIpcInvoke<{ success: boolean; message?: string }>('inventory:product:delete', {
        productId,
        businessId: business?.id
      }, { success: false });

      if (response?.success) {
        setProducts(products.filter(p => p.id !== productId));
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to delete product',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: 'Failed to delete product',
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'low_stock':
        return 'bg-red-100 text-red-800';
      case 'medium_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'high_stock':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p>Loading products...</p>
        <p className="text-sm text-gray-500">This may take a few moments</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {filteredProducts.length === 0 && !isLoading ? (
        <EmptyState onAddProduct={onAddProduct} />
      ) : (
        <>
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center flex-1">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(categories).map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={onAddProduct}>Add Product</Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Filter by Shops</h3>
              <div className="space-y-2">
                {business?.shops?.map((shop: any) => (
                  <div key={shop.dataValues.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`shop-${shop.dataValues.id}`}
                      checked={selectedShops.includes(shop.dataValues.id)}
                      onCheckedChange={(checked) => handleShopSelection(shop.dataValues.id, checked as boolean)}
                    />
                    <label
                      htmlFor={`shop-${shop.dataValues.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {shop.dataValues.name || 'Unnamed Shop'}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            {product.featuredImage && (
                              <Image
                                src={product.featuredImage}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="rounded-md"
                              />
                            )}
                            <span>{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{product.category_id ? categories[product.category_id] : 'Uncategorized'}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>${product.sellingPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(product.status)}`}>
                            {product.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onProductClick(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => product.id && handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
