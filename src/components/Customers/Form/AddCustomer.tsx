"use client"

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ChevronLeft } from "lucide-react"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { Country, State } from 'country-state-city';
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout";
import { Checkbox } from "@/components/Shared/ui/checkbox";

interface AddCustomerProps {
  onBack: () => void;
}

interface CustomerFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  country: string;
  address: string;
  city: string;
  region: string;
  shopIds: string[];
}

export function AddCustomer({ onBack }: AddCustomerProps) {
  const { user, business } = useAuthLayout();
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    country: '',
    address: '',
    city: '',
    region: '',
    shopIds: []
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleShopSelection = (shopId: string, checked: boolean) => {
    setFormData(prev => {
      const updatedShopIds = checked
        ? [...prev.shopIds, shopId]
        : prev.shopIds.filter(id => id !== shopId);
      return { ...prev, shopIds: updatedShopIds };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await safeIpcInvoke('entities:customer:create', {
        customerData: {
          ...formData,
          shopIds: formData.shopIds
        }
      }, { success: false });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Customer created successfully",
        });
        onBack(); // Return to customer list
      } else {
        toast({
          title: "Error",
          description: "Failed to create customer",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">Add Customer</h1>
        <div className="flex flex-col md:flex-row w-full md:w-auto">
          <div className="flex flex-col md:flex-row w-full">
            <Button type="button" variant="outline" onClick={onBack} className="mr-2 mb-2 md:mb-0 w-full md:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full md:w-auto">Save</Button>
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <p className="text-sm text-gray-500">Most important information about the customer</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">First Name</label>
              <Input 
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full" 
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Name</label>
              <Input 
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full" 
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone Number</label>
              <Input 
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full" 
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <Input 
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <Input 
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">City</label>
              <Input 
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Country</label>
              <Select
                options={countryList().getData()}
                value={countryList().getData().find(option => option.value === formData.country)}
                onChange={(option) => setFormData(prev => ({ ...prev, country: option?.value || '' }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Region</label>
              {formData.country ? (
                <Select
                  options={State.getStatesOfCountry(formData.country).map(state => ({
                    value: state.isoCode,
                    label: state.name
                  }))}
                  value={State.getStatesOfCountry(formData.country)
                    .map(state => ({ value: state.isoCode, label: state.name }))
                    .find(option => option.value === formData.region)}
                  onChange={(option) => setFormData(prev => ({ ...prev, region: option?.value || '' }))}
                  isClearable
                />
              ) : (
                <Input
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  className="w-full" 
                />
              )}
            </div>
            <div className="space-y-4">
              <h3 className="font-medium">Assign to Shops</h3>
              <div className="space-y-2">
                {business?.shops?.map((shop: any) => (
                  <div key={shop.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={shop.id}
                      checked={formData.shopIds.includes(shop.id)}
                      onCheckedChange={(checked: boolean) => 
                        handleShopSelection(shop.id, checked)}
                      disabled={user?.role !== 'admin' && user?.role !== 'shop_owner' && formData.shopIds.length > 0}
                    />
                    <label
                      htmlFor={shop.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {shop.name || 'Unnamed Shop'}
                    </label>
                  </div>
                ))}
              </div>
              {formData.shopIds.length === 0 && (
                <p className="text-sm text-red-500">Please select at least one shop</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
