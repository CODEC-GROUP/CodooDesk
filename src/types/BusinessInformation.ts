export interface BusinessInformation {
  id: string;
  fullBusinessName: string;
  businessType: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  numberOfEmployees: number;
  taxIdNumber: string;
  shopLogo: string | null; 
  taxationDocuments: string | null; 
  nationalIdCard: string | null; 
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  legalStructure: string;
  yearEstablished: number;
  industryCategory: string;
  annualRevenue?: number;
  businessDescription: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBusinessInformationDto {
  fullBusinessName: string;
  businessType: string;
  address: BusinessInformation['address'];
  numberOfEmployees: number;
  taxIdNumber: string;
  contactInfo: BusinessInformation['contactInfo'];
  legalStructure: string;
  yearEstablished: number;
  industryCategory: string;
  businessDescription: string;
}

export interface UpdateBusinessInformationDto {
  fullBusinessName?: string;
  businessType?: string;
  address?: Partial<BusinessInformation['address']>;
  numberOfEmployees?: number;
  taxIdNumber?: string;
  shopLogo?: string | null;
  taxationDocuments?: string | null;
  nationalIdCard?: string | null;
  contactInfo?: Partial<BusinessInformation['contactInfo']>;
  legalStructure?: string;
  yearEstablished?: number;
  industryCategory?: string;
  annualRevenue?: number;
  businessDescription?: string;
}
