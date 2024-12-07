'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Switch } from "@/components/Shared/ui/switch"
import { Label } from "@/components/Shared/ui/label"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { ChevronLeft, Camera } from 'lucide-react'
import { ChangeEvent } from 'react'
import Image from 'next/image'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { Category, Supplier, fetchProductDependencies } from '../utils/productUtils';
import Shop from '@/models/Shop';

interface AddProductProps {
  onBack: () => void;
}

interface FileUploadResponse {
  success: boolean;
  path?: string;
  fullPath?: string;
  message?: string;
}

interface ProductData {
  name: string;
  description: string;
  sellingPrice: number;
  discountPrice: number | null;
  category_id: string;
  shop_id: string;
  addTax: boolean;
  productType: string;
  businessId?: string;
  featuredImage: string | null;
  additionalImages: string[];
  status: 'active' | 'inactive';
  quantity: number;
  reorderPoint: number;
  suppliers: any[];
  purchasePrice: number;
}

interface ProductResponse {
  success: boolean;
  product?: ProductData;
  message?: string;
}

interface CategoryResponse {
  success: boolean;
  data?: Category[];
  message?: string;
}

interface ShopResponse {
  success: boolean;
  data?: Shop[];
  message?: string;
}

export function AddProduct({ onBack }: AddProductProps) {
  const { business, user } = useAuthLayout();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sellingPrice: '',
    discountPrice: '',
    category_id: '',
    shop_id: '',
    addTax: false,
    productType: '',
    quantity: '0',
    reorderPoint: '10',
    businessId: business?.id || '',
    userId: user?.id || '',
    purchasePrice: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        if (!business?.id) {
          throw new Error('Business ID is required');
        }

        const result = await fetchProductDependencies(business.id);
        setCategories(result?.categories ?? []);
        setSuppliers(result?.suppliers ?? []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load initial data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [business?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!business?.id) {
        toast({
          title: "Error",
          description: "Business information is missing",
          variant: "destructive",
        });
        return;
      }

      if (!formData.shop_id) {
        toast({
          title: "Error",
          description: "Please select a shop",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      // First, handle image uploads
      let featuredImagePath = null;
      let additionalImagePaths: string[] = [];

      // Handle featured image
      if (featuredImage) {
        const buffer = await featuredImage.arrayBuffer();
        const response = await safeIpcInvoke<FileUploadResponse>('file:store', {
          buffer: Buffer.from(buffer),
          fileName: `${Date.now()}-${featuredImage.name}`,
          category: 'products'
        }, { success: false });

        if (response?.success && response.fullPath) {
          featuredImagePath = response.fullPath;
        } else {
          throw new Error('Failed to upload featured image');
        }
      }

      // Handle additional images
      if (additionalImages.length > 0) {
        for (const image of additionalImages) {
          const buffer = await image.arrayBuffer();
          const response = await safeIpcInvoke<FileUploadResponse>('file:store', {
            buffer: Buffer.from(buffer),
            fileName: `${Date.now()}-${image.name}`,
            category: 'products'
          }, { success: false });

          if (response?.success && response.fullPath) {
            additionalImagePaths.push(response.fullPath);
          } else {
            toast({
              title: "Warning",
              description: `Failed to upload additional image: ${image.name}`,
              variant: "destructive",
            });
          }
        }
      }

      const productData = {
        ...formData,
        sellingPrice: parseFloat(formData.sellingPrice),
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
        quantity: parseInt(formData.quantity),
        reorderPoint: parseInt(formData.reorderPoint),
        suppliers: selectedSuppliers,
        featuredImage: featuredImagePath,
        additionalImages: additionalImagePaths,
        status: 'active',
        purchasePrice: parseFloat(formData.purchasePrice)
      };

      const response = await safeIpcInvoke<ProductResponse>(
        'inventory:product:create',
        { data: productData },
        { success: false }
      );

      if (response?.success) {
        toast({
          title: "Success",
          description: "Product created successfully",
        });
        onBack();
      } else {
        throw new Error(response?.message ?? 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create product',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = (inputId: string) => {
    const inputElement = document.getElementById(inputId) as HTMLInputElement;
    if (inputElement) {
      inputElement.click();
    }
  };

  const handleFeaturedImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeaturedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropFeaturedImage = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFeaturedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeaturedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAdditionalImages(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setAdditionalImagePreviews(previews);
  };

  const handleDropAdditionalImages = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setAdditionalImages(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setAdditionalImagePreviews(previews);
  };

  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="mr-2 h-5 w-5" /> Back
      </Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold flex items-center text-gray-800">
          Add Product
        </h1>
        <div className="space-x-2">
          <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50">Cancel</Button>
          <Button className="bg-[#1A7DC4] hover:bg-[#1565a0]" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="productName" className="text-sm font-medium text-gray-700">Product Name</Label>
                  <Input 
                    id="productName" 
                    placeholder="Enter a short name for your product" 
                    className="mt-1" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="productDescription" className="text-sm font-medium text-gray-700">Product Description</Label>
                  <Textarea 
                    id="productDescription" 
                    placeholder="Product description" 
                    className="mt-1 h-32"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-800">Featured Image</h2>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
                    onDragOver={handleDragOver}
                    onDrop={handleDropFeaturedImage}
                  >
                    <label htmlFor="featuredImage" className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="w-full text-[#1A7DC4] border-[#1A7DC4] hover:bg-[#1A7DC4] hover:text-white"
                        onClick={() => handleButtonClick('featuredImage')}
                      >
                        Add File
                      </Button>
                      <input
                        id="featuredImage"
                        type="file"
                        className="hidden"
                        onChange={handleFeaturedImageChange}
                        accept="image/*"
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-2">Or drag and drop files</p>
                    {featuredImagePreview && (
                      <div className="mt-4">
                        <Image src={featuredImagePreview} alt="Featured preview" width={200} height={200} objectFit="cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-800">Additional Images(Optional)</h2>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
                    onDragOver={handleDragOver}
                    onDrop={handleDropAdditionalImages}
                  >
                    <label htmlFor="additionalImages" className="cursor-pointer">
                      <Button
                        variant="outline"
                        className="w-full text-[#1A7DC4] border-[#1A7DC4] hover:bg-[#1A7DC4] hover:text-white"
                        onClick={() => handleButtonClick('additionalImages')}
                      >
                        Add Files
                      </Button>
                      <input
                        id="additionalImages"
                        type="file"
                        className="hidden"
                        onChange={handleAdditionalImagesChange}
                        accept="image/*"
                        multiple
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-2">Or drag and drop files</p>
                    {additionalImages.length > 0 && (
                      <p className="text-sm text-green-600 mt-2">{additionalImages.length} images selected</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Price/Type</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="purchasePrice" className="text-sm font-medium text-gray-700">Purchase Price (FCFA)</Label>
                  <Input 
                    id="purchasePrice" 
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                    className="mt-1"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="sellingPrice" className="text-sm font-medium text-gray-700">Selling Price (FCFA)</Label>
                  <Input 
                    id="sellingPrice" 
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: e.target.value }))}
                    className="mt-1"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="productType" className="text-sm font-medium text-gray-700">Product Type</Label>
                  <Select value={formData.productType} onValueChange={(value) => setFormData(prev => ({ ...prev, productType: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Product Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="type3">Physical Product</SelectItem>
                      <SelectItem value="digital">Digital Product</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* <div className="flex items-center space-x-2 mt-4">
                <Switch id="tax" checked={addTax} onCheckedChange={setAddTax} />
                <Label htmlFor="tax" className="text-sm font-medium text-gray-700">Add tax for this product(optional)</Label>
              </div> */}
              {/* <p className="text-sm text-gray-500 mt-2">This is digital item</p> */}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Stock Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">Initial Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reorderPoint" className="text-sm font-medium text-gray-700">Reorder Point</Label>
                  <Input 
                    id="reorderPoint" 
                    type="number"
                    min="0"
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">Stock level that triggers low stock warning</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Shop, Category and Suppliers</h2>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shop</Label>
                    <Select 
                      value={formData.shop_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, shop_id: value }))}
                      disabled={!business?.shops || business?.shops.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {business?.shops?.map((shop: any) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={formData.category_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                      disabled={categories.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Suppliers</Label>
                  <div className="space-y-2">
                    {suppliers.map((supplier) => (
                      <div key={supplier.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`supplier-${supplier.id}`}
                          checked={selectedSuppliers.includes(supplier.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSuppliers([...selectedSuppliers, supplier.id]);
                            } else {
                              setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplier.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`supplier-${supplier.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {supplier.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Scan(Not available)</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Camera className="mx-auto mb-2 text-gray-400" size={24} />
                <p className="text-sm text-gray-500">Scan Image</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
