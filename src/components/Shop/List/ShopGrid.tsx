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
  const { business, user } = useAuthLayout();

  // Fetch shops on mount
  useEffect(() => {
    if (!business?.id || !user?.id) {
      return;
    }

    const loadShops = async () => {
      if (business?.shops && Array.isArray(business.shops)) {
        setShops(business.shops);
        console.log(business.shops)
      } else {
        await fetchShops();
      }
    };

    loadShops();
  }, [business?.id, user?.id, business?.shops]);

  const fetchShops = async () => {
    try {
      setIsLoading(true);

      // Different query based on user role
      const queryParams = {
        businessId: business?.id,
        userId: user?.id,
        role: user?.role
      };

      const response = await safeIpcInvoke('entities:shop:get-all', queryParams, {
        success: false,
        shops: []
      });

      console.log(response)

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

  const handleUpdateShop = async (data: {
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
      status?: 'active' | 'inactive';
    };
    locationData: {
      address: string;
      city: string;
      country: string;
      region?: string;
    }
  }) => {
    if (!editingShop?.id) {
      toast({
        title: "Error",
        description: "Shop ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await safeIpcInvoke('entities:shop:update', {
        shopId: editingShop.id,
        shopData: {
          ...data.shopData,
          businessId: business?.id,
        },
        locationData: data.locationData
      }, { success: false, message: '' });

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

  const handleEdit = (shop: Shop) => {
    setEditingShop(shop);
  };

  const handleCancelEdit = () => {
    setEditingShop(null);
  };

  const handleToggleShop = async (shopId: number) => {
    try {
      const shop = shops.find(s => s.id === shopId);
      const newStatus = shop?.status === 'active' ? 'inactive' : 'active';

      const response = await safeIpcInvoke('entities:shop:update', {
        shopId,
        shopData: {
          ...shop,
          status: newStatus,
          businessId: business?.id,
        }
      }, { success: false, message: '' });

      if (response?.success) {
        setShops(prevShops =>
          prevShops.map(s =>
            s.id === shopId ? { ...s, status: newStatus } : s
          )
        );
      } else {
        throw new Error(response?.message ?? 'Failed to update shop status');
      }
    } catch (error) {
      console.error('Error toggling shop status:', error);
      toast({
        title: "Error",
        description: "Failed to update shop status",
        variant: "destructive",
      });
    }
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
            {/* <Button
              onClick={() => setIsAddingShop(true)}
              disabled={!business?.id}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Shop
            </Button> */}
          </div>

          {isAddingShop && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <ShopForm
                  onSave={handleAddShop}
                  onCancel={() => setIsAddingShop(false)}
                />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <Card key={shop.id} className="relative">
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <Switch
                    checked={shop.status === 'active'}
                    onCheckedChange={() => handleToggleShop(shop.id!)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(shop)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardHeader>
                  <CardTitle>{shop.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {editingShop && editingShop.id === shop.id ? (
                    <ShopForm
                      shop={shop}
                      onSave={handleUpdateShop}
                      onCancel={handleCancelEdit}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-[#EBF5FF] rounded-full flex items-center justify-center">
                          <Store className="h-8 w-8 text-[#2E90FA]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p><strong>Type:</strong> {shop.type}</p>
                        <p><strong>Manager:</strong> {shop.manager || 'Not assigned'}</p>
                        <p><strong>Status:</strong> {shop.status}</p>
                        <p><strong>Location:</strong> {shop.location?.address}, {shop.location?.city}</p>
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