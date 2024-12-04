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

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkSetupStatus, business } = useAuthLayout();
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({ name: "", description: "", image: null })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  useEffect(() => {
    const init = async () => {
      const isSetup = await checkSetupStatus();
      if (isSetup && business?.id) {
        loadCategories();
      } else {
        setError('Business setup incomplete');
      }
    };
    init();
  }, [business?.id, checkSetupStatus]);

  const loadCategories = async () => {
    try {
      const result = await safeIpcInvoke('inventory:category:get-all', {
        businessId: business?.id
      }, { success: false, categories: [] });

      if (result?.success) {
        setCategories(result.categories);
      } else if (result) {
        setError('Failed to load data');
      } else {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
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
        setCategories(prev => [...prev, result.category] as Category[]);
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

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const result = await safeIpcInvoke<DeleteCategoryResult>('inventory:category:delete', {
        categoryId,
        businessId: business?.id
      }, { success: false });

      if (result?.success) {
        setCategories(categories.filter(cat => cat.id !== categoryId));
      } else {
        setError(result?.message || 'Failed to delete category');
      }
    } catch (err) {
      setError('Failed to delete category');
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <Image 
                  src={typeof category.image === 'string' ? category.image : "/placeholder.svg?height=100&width=100"} 
                  alt={category.name} 
                  width={100}
                  height={100}
                  className="w-full h-40 object-cover mb-2 rounded" 
                />
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.itemCount} items</p>
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Categories