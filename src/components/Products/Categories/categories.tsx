"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/Shared/ui/dialog"
import { Search, Plus, Edit, Trash2 } from "lucide-react"
import Image from 'next/image'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { ConfirmationDialog } from '@/components/Shared/ui/Modal/confirmation-dialog';
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

interface Category {
  id: string;
  name: string;
  image?: File | null | string;
  description?: string;
  itemCount?: number;
}

interface DeleteCategoryResult {
  success: boolean;
  message?: string;
}

interface GetCategoriesResult {
  success: boolean;
  categories?: Category[];
  message?: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkSetupStatus, business } = useAuthLayout();
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({ name: "", description: "", image: null })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const isSetup = await checkSetupStatus();
        if (!isSetup) {
          setError('Business setup incomplete');
          return;
        }
        
        if (!business?.id) {
          setError('Business information not found');
          return;
        }
        
        await loadCategories();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize categories');
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, [business?.id, checkSetupStatus]);

  const loadCategories = async () => {
    try {
      setError(null);
      const result = await safeIpcInvoke('inventory:category:get-all', {
        businessId: business?.id
      }, { success: false, categories: [] } as GetCategoriesResult);

      if (result?.success) {
        setCategories(result.categories || []);
      } else {
        setError(result?.message || 'Failed to load categories');
      }
    } catch (err) {
      console.error('Load categories error:', err);
      setError('Failed to load categories');
    }
  };

  const filteredCategories = categories.filter(category =>
    category?.name?.toLowerCase().includes(searchTerm?.toLowerCase() ?? '') ?? false
  )

  const handleAddCategory = async () => {
    try {
      let imagePath = null;
      if (newCategory.image instanceof File) {
        const buffer = await newCategory.image.arrayBuffer();
        
        const uploadResult = await safeIpcInvoke('file:store', {
          buffer: Buffer.from(buffer),
          fileName: newCategory.image.name,
          category: 'categories'
        }, { success: false, path: '', fullPath: '' });
        
        if (uploadResult?.success) {
          imagePath = uploadResult.fullPath;
        }
      }

      const result = await safeIpcInvoke('inventory:category:create', {
        data: {
          ...newCategory,
          image: imagePath,
          businessId: business?.id
        }
      }, { success: false, category: null });

      if (result?.success && result.category) {
        const newCategoryData = {
          id: (result.category as any).dataValues.id,
          name: (result.category as any).dataValues.name,
          description: (result.category as any).dataValues.description,
          image: (result.category as any).dataValues.image,
          businessId: (result.category as any).dataValues.businessId,
        };
        setCategories(prev => [...prev, newCategoryData]);
        setIsAddCategoryOpen(false);
        setNewCategory({ name: "", description: "", image: null });
        setEditingCategory(null);
      } else {
        setError('Failed to create category');
      }
    } catch (err) {
      setError('Failed to create category');
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setNewCategory({ 
      name: category.name, 
      description: category.description, 
      image: typeof category.image === 'string' ? category.image : null
    })
    setIsAddCategoryOpen(true)
  }

  const handleUpdateCategory = async () => {
    if (editingCategory) {
      try {
        let imagePath = newCategory.image;
        
        if (newCategory.image instanceof File) {
          const buffer = await newCategory.image.arrayBuffer();
          
          const uploadResult = await safeIpcInvoke('file:store', {
            buffer: Buffer.from(buffer),
            fileName: newCategory.image.name,
            category: 'categories'
          }, { success: false, path: '', fullPath: '' });
          
          if (uploadResult?.success) {
            imagePath = uploadResult.fullPath;
          }
        }

        const result = await safeIpcInvoke('inventory:category:update', {
          categoryId: editingCategory.id,
          data: {
            ...newCategory,
            image: imagePath,
            businessId: business?.id
          }
        }, { success: false, category: null });

        if (result?.success && result.category) {
          const updatedCategories = categories.map(cat =>
            cat.id === editingCategory.id ? result.category : cat
          ).filter((category): category is Category => category !== null);
          setCategories(updatedCategories);
          setIsAddCategoryOpen(false);
          setEditingCategory(null);
          setNewCategory({ name: "", description: "", image: null });
        } else {
          setError('Failed to update category');
        }
      } catch (err) {
        setError('Failed to update category');
      }
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
    try {
      if (!categoryToDelete) return;

      const result = await safeIpcInvoke<DeleteCategoryResult>(
        'inventory:category:delete', 
        { id: categoryToDelete.id },
        { success: false }
      );

      if (result?.success) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
        toast({
          title: "Success",
          description: "Category deleted successfully"
        });
      } else {
        throw new Error(result?.message || 'Failed to delete category');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive"
      });
    } finally {
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">
                  Image
                </Label>
                <Input
                  id="image"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files ? e.target.files[0] : null;
                    setNewCategory({ ...newCategory, image: file });
                  }}
                  className="col-span-3"
                />
              </div>
            </div>
            <Button onClick={editingCategory ? handleUpdateCategory : handleAddCategory}>
              {editingCategory ? "Update Category" : "Add Category"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{error}</p>
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => {
              setError(null);
              loadCategories();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <ToggleGroup 
              type="single" 
              value={viewMode}
              onValueChange={(value) => setViewMode(value as "cards" | "list")}
            >
              <ToggleGroupItem value="cards" aria-label="Card view">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="7" height="7" x="3" y="3" rx="1"/>
                  <rect width="7" height="7" x="14" y="3" rx="1"/>
                  <rect width="7" height="7" x="14" y="14" rx="1"/>
                  <rect width="7" height="7" x="3" y="14" rx="1"/>
                </svg>
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" x2="21" y1="6" y2="6"/>
                  <line x1="8" x2="21" y1="12" y2="12"/>
                  <line x1="8" x2="21" y1="18" y2="18"/>
                  <line x1="3" x2="3.01" y1="6" y2="6"/>
                  <line x1="3" x2="3.01" y1="12" y2="12"/>
                  <line x1="3" x2="3.01" y1="18" y2="18"/>
                </svg>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No categories found</p>
              <Button onClick={() => setIsAddCategoryOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Category
              </Button>
            </div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCategories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-4">
                    <Image 
                      src={typeof category.image === 'string' && category.image ? category.image : "/assets/images/categories.png"} 
                      alt={category.name} 
                      width={100}
                      height={100}
                      className="w-full h-40 object-cover mb-2 rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/assets/images/categories.png';
                      }}
                    />
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.itemCount} items</p>
                    <div className="flex justify-end mt-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredCategories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Image 
                      src={typeof category.image === 'string' && category.image ? category.image : "/assets/images/categories.png"} 
                      alt={category.name} 
                      width={60}
                      height={60}
                      className="w-15 h-15 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/assets/images/categories.png';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.itemCount} items</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      <ConfirmationDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Category"
        description={`Are you sure you want to delete ${categoryToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}

export default Categories