"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Input } from "@/components/Shared/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { PlusCircle, Edit2, Store } from "lucide-react"
import { ShopForm } from '../Setup/shop-form'
import { Switch } from "@/components/Shared/ui/switch"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';

// Interface for Shop
export interface Shop {
  id?: number;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  contactInfo: {
    email: string;
    phone: string;
  };
  manager: string;
  managerId?: string;
  location: {
    address: string;
    city: string;
    country: string;
    region?: string;
  };
  operatingHours: {
    [key: string]: string;
  };
  businessId: string;
}

interface ShopFormData {
  name: string;
  type: string;
  phone: string;
  email: string;
  operatingHours: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  manager?: string;
  location: {
    address: string;
    city: string;
    country: string;
  };
}

interface ShopFormProps {
  shop?: Shop;
  onSave: (data: { 
    shopData: {
      name: string;
      type: string;
      phone: string;
      email: string;
      operatingHours: {
        monday?: string;
        tuesday?: string;
        wednesday?: string;
        thursday?: string;
        friday?: string;
        saturday?: string;
        sunday?: string;
      };
      manager?: string;
    };
    locationData: { 
      address: string;
      city: string;
      country: string;
    }
  }) => Promise<void>;
  onCancel: () => void;
}

interface UpdateShopResponse {
  success: boolean;
  message?: string;
}

export function Shops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isAddingShop, setIsAddingShop] = useState<boolean>(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { business } = useAuthLayout();

  // Fetch shops on mount
  useEffect(() => {
    if (business?.id) {
      fetchShops();
    }
  }, [business?.id]);

  const fetchShops = async () => {
    try {
      setIsLoading(true);
      const response = await safeIpcInvoke('entities:shop:get-all', {
        businessId: business?.id
      }, { 
        success: false, 
        shops: [] 
      });

      if (response?.success) {
        setShops(response.shops);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      toast({
        title: "Error",
        description: "Failed to load shops",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShop = async (data: { 
    shopData: {
      name: string;
      type: string;
      contactInfo: {
        phone: string;
        email: string;
      };
      operatingHours: {
        [key: string]: string;
      };
      manager: string;
      managerId?: string;
      status?: 'active' | 'inactive';
    };
    locationData: { 
      address: string;
      city: string;
      country: string;
      region?: string;
    }
  }) => {
    if (!business?.id) {
      toast({
        title: "Error",
        description: "Business ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await safeIpcInvoke('entities:shop:create', {
        shopData: {
          ...data.shopData,
          businessId: business.id,
          status: 'active'
        },
        locationData: data.locationData
      }, { success: false, message: '' });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Shop created successfully",
        });
        setIsAddingShop(false);
        fetchShops();
      } else {
        throw new Error(response?.message ?? 'Failed to create shop');
      }
    } catch (error) {
      console.error('Error creating shop:', error);
      toast({
        title: "Error",
        description: "Failed to create shop",
        variant: "destructive",
      });
    }
  };

  const handleEditShop = async (data: { 
    shopData: {
      name: string;
      type: string;
      contactInfo: {
        phone: string;
        email: string;
      };
      operatingHours: {
        [key: string]: string;
      };
      manager: string;
      managerId?: string;
      status?: 'active' | 'inactive';
    };
    locationData: { 
      address: string;
      city: string;
      country: string;
      region?: string;
    }
  }) => {
    try {
      const response = await safeIpcInvoke<UpdateShopResponse>('entities:shop:update', {
        id: editingShop?.id,
        updates: {
          ...data.shopData,
          location: data.locationData
        }
      });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Shop updated successfully",
        });
        setEditingShop(null);
        fetchShops();
      } else {
        throw new Error(response?.message ?? 'Failed to update shop');
      }
    } catch (error) {
      console.error('Error updating shop:', error);
      toast({
        title: "Error",
        description: "Failed to update shop",
        variant: "destructive",
      });
    }
  };

  const handleToggleShop = async (shopId: number) => {
    try {
      const shop = shops.find(s => s.id === shopId);
      const newStatus = shop?.status === 'active' ? 'inactive' : 'active';
      
      const response = await safeIpcInvoke<UpdateShopResponse>('entities:shop:update', {
        id: shopId,
        updates: { status: newStatus }
      });

      if (response?.success) {
        setShops(shops.map(s => 
          s.id === shopId ? { ...s, status: newStatus } : s
        ));
      } else {
        throw new Error(response?.message || 'Failed to update shop status');
      }
    } catch (error) {
      console.error('Error updating shop status:', error);
      toast({
        title: "Error",
        description: "Failed to update shop status",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingShop(null);
    setIsAddingShop(false);
  };

  return (
    <div className="container mx-auto py-10">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Shops</h1>
            <Button 
              onClick={() => setIsAddingShop(true)}
              disabled={!business?.id}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Shop
            </Button>
          </div>

          {isAddingShop && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Shop</CardTitle>
              </CardHeader>
              <CardContent>
                <ShopForm onSave={handleAddShop} onCancel={handleCancelEdit} />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map(shop => (
              <Card key={shop.id} className="relative">
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <Switch
                    checked={shop.status === 'active'}
                    onCheckedChange={() => handleToggleShop(shop.id!)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingShop(shop)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">{shop.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {editingShop && editingShop.id === shop.id ? (
                    <ShopForm shop={shop} onSave={handleEditShop} onCancel={handleCancelEdit} />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-[#EBF5FF] rounded-full flex items-center justify-center">
                          <Store className="h-8 w-8 text-[#2E90FA]" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Input value={shop.name} readOnly />
                        <Input value={shop.type} readOnly />
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(shop.operatingHours || {}).map(([day, hours]) => (
                            <Input key={day} value={`${day}: ${hours}`} readOnly />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={shop.contactInfo?.phone || 'No Phone'} readOnly />
                          <Input value={shop.manager || 'No Manager'} readOnly />
                        </div>
                        <Input value={shop.location?.address} readOnly />
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={shop.location?.city} readOnly />
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue>{shop.location?.country}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={shop.location?.country}>{shop.location?.country}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}