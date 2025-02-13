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
import { ConfirmationDialog } from "@/components/Shared/ui/Modal/confirmation-dialog"
import { AddProduct } from '../Form/AddProduct';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/Shared/ui/dropdown-menu"
import { useRouter } from 'next/navigation'

interface ProductListProps {
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

const normalizeImagePath = (imagePath: string | null): string => {
  if (!imagePath) return '/assets/images/box.png';
  // Handle Windows paths and ensure proper formatting
  return imagePath.replace(/\\/g, '/');
};

export function ProductList({ onAddProduct }: ProductListProps) {
  const { business, user, availableShops } = useAuthLayout();
  const router = useRouter();
  const [products, setProducts] = useState<ProductAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [productToDelete, setProductToDelete] = useState<ProductAttributes | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductAttributes | null>(null);

  // Initialize data when business is available
  useEffect(() => {
    const loadData = async () => {
      if (business?.id) {
        console.log('Business ID found, initializing data');
        await initializeData();
      } else {
        console.log('No business ID found, waiting...');
        setIsLoading(false);
      }
    };

    loadData();
  }, [business?.id]);

  console.log('Business:', business);
  console.log('User:', user);

  // Update initialization effect to only run when explicitly called
  const initializeData = async () => {
    if (!business?.id) {
      console.log('No business ID during initialization');
      setError('Business configuration not loaded - please check your business setup');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Get shop IDs based on user role
      const shopIds = (user?.role === 'admin' || user?.role === 'shop_owner')
        ? business.shops?.map(shop => shop.id) || []
        : [availableShops?.[0]?.id].filter(Boolean) as string[];

      console.log('Found shop IDs:', shopIds);

      if (shopIds.length === 0) {
        console.log('No shop IDs found');
        setError('No shops available - create shops first');
        setProducts([]);
        return;
      }

      const response = await safeIpcInvoke<ProductResponse>('inventory:product:get-all', {
        shopIds,
        businessId: business.id
      }, {
        success: false,
        products: []
      });

      console.log('Product response:', response);

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
      setError('Failed to load products - try refreshing');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDeleteClick = (product: ProductAttributes) => {
    setProductToDelete(product);
  };

  const handleCancelDelete = () => {
    setProductToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete?.id) {
      try {
        const response = await safeIpcInvoke<{ success: boolean; message?: string }>(
          'inventory:product:delete',
          {
            productId: productToDelete.id,
            businessId: business?.id
          },
          { success: false }
        );

        if (response?.success) {
          setProducts(products.filter(p => p.id !== productToDelete.id));
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
      } finally {
        setProductToDelete(null);
      }
    }
  };

  const handleEdit = (product: ProductAttributes) => {
    setEditingProduct(product);
  };

  const handleEditComplete = () => {
    setEditingProduct(null);
    initializeData();
  };

  const filteredProducts = products.filter(product => {
    // Search term matching
    const matchesSearch = searchTerm.trim() === '' ? true : (
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(product.sellingPrice).includes(searchTerm)
    );

    // Category filtering
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
      <div className="flex items-center justify-center p-8 text-destructive">
        <AlertCircle className="mr-2" />
        <div className="flex flex-col items-center">
          <span className="mb-4">{error}</span>
          <Button 
            variant="outline"
            onClick={() => initializeData()}
          >
            Retry Initialization
          </Button>
        </div>
      </div>
    );
  }

  if (editingProduct) {
    return (
      <AddProduct 
        onBack={() => setEditingProduct(null)}
        editMode={true}
        productToEdit={editingProduct}
        onEditComplete={handleEditComplete}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      {products.length === 0 && !isLoading ? (
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

            {(user?.role === 'admin' || user?.role === 'shop_owner') && (
              <div className="space-y-4">
                <h3 className="font-medium">Filter by Shops</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <ListFilter className="mr-2 h-4 w-4" />
                      {selectedShops.length === 0 
                        ? "Select Shops" 
                        : `${selectedShops.length} shop${selectedShops.length > 1 ? 's' : ''} selected`
                      }
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-2">
                    {business?.shops?.map((shop: any) => (
                      <div key={shop.id} className="flex items-center space-x-2 p-2">
                        <Checkbox
                          id={`shop-${shop.id}`}
                          checked={selectedShops.includes(shop.id)}
                          onCheckedChange={(checked) => handleShopSelection(shop.id, checked as boolean)}
                        />
                        <label
                          htmlFor={`shop-${shop.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {shop.name || 'Unnamed Shop'}
                        </label>
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

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
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <p className="mb-2">No products found</p>
                            <p className="text-sm text-gray-400">
                              Try adjusting your search or filter criteria
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <Image
                                src={normalizeImagePath(product.featuredImage)}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="rounded-md object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/assets/images/box.png';
                                }}
                              />
                              <span>{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.category_id ? categories[product.category_id] : 'Uncategorized'}</TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell>{product.sellingPrice.toLocaleString()} FCFA</TableCell>
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
                                onClick={() => handleEdit(product)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <ConfirmationDialog
            isOpen={!!productToDelete}
            onClose={handleCancelDelete}
            onConfirm={handleConfirmDelete}
            title="Delete Product"
            description={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}
