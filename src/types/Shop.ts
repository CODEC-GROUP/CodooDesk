import { BusinessInformation } from './BusinessInformation.js';

export interface Shop {
  id: string;
  name: string;
  type: string;
  description: string;
  businessId: string;  // Reference to the associated BusinessInformation
  ownerId: string;  // Reference to the User who owns this shop
  status: 'active' | 'inactive';
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contactInfo: {
    phone: string;
    email: string;
  };
  operatingHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  categories: string[];  // List of product categories offered in this shop
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShopDto {
  name: string;
  description: string;
  businessId: string;
  ownerId: string;
  location: Shop['location'];
  contactInfo: Shop['contactInfo'];
  operatingHours: Shop['operatingHours'];
  categories: string[];
}

export interface UpdateShopDto {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
  location?: Partial<Shop['location']>;
  contactInfo?: Partial<Shop['contactInfo']>;
  operatingHours?: Partial<Shop['operatingHours']>;
  categories?: string[];
}
