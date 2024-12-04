'use client';

import { useState, useMemo, ChangeEvent } from "react";
import { Button } from "@/components/Shared/ui/button";
import { Input } from "@/components/Shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select";
import { PlusCircle, Clock, Store } from "lucide-react";
import { Shop } from '../List/ShopGrid';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';
import { toast } from '@/hooks/use-toast';
import countryList from 'react-select-country-list';
import ReactSelect from 'react-select';
import { State } from 'country-state-city';
import { Label } from "@/components/Shared/ui/label";
import { useQuery } from '@tanstack/react-query';
import { safeIpcInvoke } from '@/lib/ipc';

interface ShopFormData {
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
  location: {
    address: string;
    city: string;
    country: string;
    region?: string;
  };
}

interface ShopFormProps {
  shop?: Shop;
  onSave: (data: { 
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
    };
  }) => Promise<void>;
  onCancel: () => void;
}

const shopTypes = [
  "Retail Store",
  "Restaurant",
  "Supermarket",
  "Pharmacy",
  "Electronics Store",
  "Fashion Boutique",
  "Other"
];

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

interface EmployeesResponse {
  success: boolean;
  employees: Employee[];
  message?: string;
}

export function ShopForm({ shop, onSave, onCancel }: ShopFormProps) {
  const { business } = useAuthLayout();
  const [formData, setFormData] = useState<ShopFormData>({
    name: shop?.name || "",
    type: shop?.type || "",
    contactInfo: {
      phone: shop?.contactInfo?.phone || "",
      email: shop?.contactInfo?.email || ""
    },
    operatingHours: shop?.operatingHours || {
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: "",
      sunday: ""
    },
    manager: shop?.manager || "",
    managerId: shop?.managerId || "",
    status: shop?.status || 'active',
    location: {
      address: shop?.location?.address || "",
      city: shop?.location?.city || "",
      country: shop?.location?.country || "",
      region: shop?.location?.region || ""
    }
  });

  // Country select options
  const countryOptions = useMemo(() => countryList().getData(), []);

  // Region/State select options
  const regionOptions = useMemo(() => {
    if (!formData.location.country) return [];
    return State.getStatesOfCountry(formData.location.country).map(state => ({
      value: state.isoCode,
      label: state.name
    }));
  }, [formData.location.country]);

  const { 
    data: employeesData, 
    isLoading: isLoadingEmployees,
    error: employeesError 
  } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await safeIpcInvoke<EmployeesResponse>(
        'entities:employee:get-all',
        { businessId: business?.id }
      );

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch employees');
      }

      return response;
    }
  });

  const employees = employeesData?.employees || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!business?.id) {
      toast({
        title: "Error",
        description: "Business ID not found",
        variant: "destructive",
      });
      return;
    }

    const shopData = {
      name: formData.name,
      type: formData.type,
      contactInfo: {
        phone: formData.contactInfo.phone,
        email: formData.contactInfo.email
      },
      operatingHours: formData.operatingHours,
      manager: formData.manager,
      managerId: formData.managerId,
      status: formData.status,
      businessId: business.id
    };

    const locationData = {
      address: formData.location.address,
      city: formData.location.city,
      country: formData.location.country,
      region: formData.location.region
    };

    try {
      await onSave({ shopData, locationData });
      onCancel();
    } catch (error) {
      console.error('Error saving shop:', error);
      toast({
        title: "Error",
        description: "Failed to save shop",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="name"
          placeholder="Shop Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Shop Type" />
          </SelectTrigger>
          <SelectContent>
            {shopTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          name="phone"
          placeholder="Phone Number"
          value={formData.contactInfo.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, phone: e.target.value } }))}
          required
        />
        <Input
          name="email"
          placeholder="Email Address"
          value={formData.contactInfo.email}
          onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: { ...prev.contactInfo, email: e.target.value } }))}
          required
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Store className="h-4 w-4" />
          Location
        </h3>
        <Input
          name="address"
          placeholder="Street Address"
          value={formData.location.address}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            location: { ...prev.location, address: e.target.value }
          }))}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="city"
            placeholder="City"
            value={formData.location.city}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              location: { ...prev.location, city: e.target.value }
            }))}
            required
          />
          <div>
            <Label htmlFor="country">Country</Label>
            <ReactSelect
              id="country"
              options={countryOptions}
              value={countryOptions.find(option => option.value === formData.location.country)}
              onChange={(option) => setFormData(prev => ({
                ...prev,
                location: { 
                  ...prev.location, 
                  country: option?.value || '',
                  region: '' // Reset region when country changes
                }
              }))}
              className="mt-1"
            />
          </div>
          {formData.location.country && (
            <div className="col-span-2">
              <Label htmlFor="region">State/Region</Label>
              <ReactSelect
                id="region"
                options={regionOptions}
                value={regionOptions.find(option => option.value === formData.location.region)}
                onChange={(option) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, region: option?.value || '' }
                }))}
                className="mt-1"
                isClearable
                placeholder="Select or type state/region"
                noOptionsMessage={() => "Type to enter custom region"}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Operating Hours
        </h3>
        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
          <div key={day} className="grid grid-cols-3 gap-4 items-center">
            <span className="capitalize">{day}</span>
            <Input
              type="time"
              value={formData.operatingHours[day]?.split('-')[0] || ''}
              onChange={(e) => {
                const closing = formData.operatingHours[day]?.split('-')[1] || '';
                setFormData(prev => ({
                  ...prev,
                  operatingHours: {
                    ...prev.operatingHours,
                    [day]: `${e.target.value}-${closing}`
                  }
                }));
              }}
            />
            <Input
              type="time"
              value={formData.operatingHours[day]?.split('-')[1] || ''}
              onChange={(e) => {
                const opening = formData.operatingHours[day]?.split('-')[0] || '';
                setFormData(prev => ({
                  ...prev,
                  operatingHours: {
                    ...prev.operatingHours,
                    [day]: `${opening}-${e.target.value}`
                  }
                }));
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}