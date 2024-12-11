"use client"

import { useState, useEffect, useMemo } from "react"
import { ipcRenderer } from 'electron'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Progress } from "@/components/Shared/ui/progress"
import { Switch } from "@/components/Shared/ui/switch"
import {
  Building2,
  Store,
  CheckCircle2,
  Upload,
  Building,
  MapPin,
  Users,
  FileText,
  CreditCard,
  Mail,
  Phone,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react"
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';
import { useRouter } from 'next/navigation';
import countryList from 'react-select-country-list'
import Select from 'react-select'
import { Country, State } from 'country-state-city';
import { safeIpcInvoke } from '@/lib/ipc';
import path from 'path';
import { fileStorage } from '@/services/fileStorage';
import { toast } from "@/hooks/use-toast"

const businessTypes = [
  'retail',
  'wholesale',
  'ecommerce',
  'manufacturing',
  'dropshipping',
  'distribution',
  'subscription',
  'service',
  'consignment',
  'b2b',
  'franchise'
]

interface FileStoreResponse {
  success: boolean;
  path?: string;
  fullPath?: string;
}

interface ValidationErrors {
  businessName?: string;
  businessType?: string;
  taxId?: string;
  employees?: string;
  shopName?: string;
  managerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  terms?: string;
  password?: string;
  reEnterPassword?: string;
  managerEmail?: string;
}

const AccountSetup = () => {
  const { setupAccount, user } = useAuthLayout();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isManager, setIsManager] = useState(false);
  const [useBusinessAddress, setUseBusinessAddress] = useState(false);
  const [formData, setFormData] = useState({
    fullBusinessName: "",
    businessType: "",
    country: "",
    city: "",
    stateProvince: "",
    street: "",
    numberOfEmployees: "",
    taxIdNumber: "",
    shopLogo: null as File | null,
    taxationDocuments: null as File | null,
    nationalIdCardFront: null as File | null,
    nationalIdCardBack: null as File | null,
    managerName: "",
    phoneNumber: "",
    email: "",
    shopName: "",
    shopLocation: "",
    shopCity: "",
    shopStateProvince: "",
    shopCountry: "",
    password: "",
    reEnterPassword: "",
    managerEmail: ""
  });

  useEffect(() => {
    if (isManager && user?.username) {
      setFormData((prev) => ({
        ...prev,
        managerName: user.username
      }));
    }
  }, [isManager, user]);

  const [showPassword, setShowPassword] = useState({
    password: false,
    reEnterPassword: false
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (files && files[0]) {
      const file = files[0];
      setFormData(prev => ({ ...prev, [name]: file }));

      // Only create preview for shop logo
      if (name === 'shopLogo') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (step === 2 && !validateStep2()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }
    
    setStep((prev) => prev + 1);
  };

  const handlePrev = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setStep((prev) => prev - 1)
  }

  const validateStep3 = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Business Details validation
    if (!formData.fullBusinessName?.trim()) {
      errors.businessName = "Business name is required";
    }
    if (!formData.businessType?.trim()) {
      errors.businessType = "Business type is required";
    }
    if (!formData.numberOfEmployees) {
      errors.employees = "Number of employees is required";
    }

    // Shop Details validation
    if (!formData.shopName?.trim()) {
      errors.shopName = "Shop name is required";
    }
    if (!formData.managerName?.trim()) {
      errors.managerName = "Manager name is required";
    }
    if (!formData.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!formData.phoneNumber?.trim()) {
      errors.phone = "Phone number is required";
    }

    // Location Details validation
    const address = useBusinessAddress ? formData.street : formData.shopLocation;
    const city = useBusinessAddress ? formData.city : formData.shopCity;
    const state = useBusinessAddress ? formData.stateProvince : formData.shopStateProvince;
    const country = useBusinessAddress ? formData.country : formData.shopCountry;

    if (!address?.trim()) {
      errors.address = "Address is required";
    }
    if (!city?.trim()) {
      errors.city = "City is required";
    }
    if (!state?.trim()) {
      errors.state = "State/Province is required";
    }
    if (!country?.trim()) {
      errors.country = "Country is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Manager Details validation
    if (!formData.managerName?.trim()) {
      errors.managerName = "Manager name is required";
    }
    
    if (!formData.phoneNumber?.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-]+$/.test(formData.phoneNumber)) {
      errors.phone = "Please enter a valid phone number";
    }
    
    if (!formData.email?.trim()) {
      errors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!formData.shopName?.trim()) {
      errors.shopName = "Shop name is required";
    }

    // Shop Address validation (only if not using business address)
    if (!useBusinessAddress) {
      if (!formData.street?.trim()) {
        errors.address = "Street address is required";
      }
      if (!formData.city?.trim()) {
        errors.city = "City is required";
      }
      if (!formData.stateProvince?.trim()) {
        errors.state = "State/Province is required";
      }
      if (!formData.country?.trim()) {
        errors.country = "Country is required";
      }
    }

    // Manager credentials (only if not the manager)
    if (!isManager) {
      if (!formData.password) {
        errors.password = "Password is required";
      }
      if (!formData.reEnterPassword) {
        errors.reEnterPassword = "Please confirm your password";
      } else if (formData.password !== formData.reEnterPassword) {
        errors.reEnterPassword = "Passwords do not match";
      }
      if (!formData.managerEmail?.trim()) {
        errors.managerEmail = "Manager email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.managerEmail)) {
        errors.managerEmail = "Please enter a valid email address";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (step === 3 && !validateStep3()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      console.error('No user ID found');
      return;
    }

    try {
      // Create an array to store all file upload promises
      const fileUploadPromises = [];
      let fileResults = {
        logoPath: null as string | null,
        taxDocsPath: null as string | null,
        frontIdPath: null as string | null,
        backIdPath: null as string | null
      };

      // Upload shop logo
      if (formData.shopLogo) {
        fileUploadPromises.push(
          formData.shopLogo.arrayBuffer().then(async (buffer) => {
            try {
              const response = await safeIpcInvoke<FileStoreResponse>('file:store', {
                buffer: Buffer.from(buffer),
                fileName: `${Date.now()}-${formData.shopLogo!.name}`,
                category: 'shop'
              }, { success: false });

              if (response?.success && response.fullPath) {
                fileResults.logoPath = response.fullPath;
              }
            } catch (error) {
              console.error('Failed to upload shop logo:', error);
            }
          })
        );
      }

      // Upload taxation documents
      if (formData.taxationDocuments) {
        fileUploadPromises.push(
          formData.taxationDocuments.arrayBuffer().then(async (buffer) => {
            try {
              const response = await safeIpcInvoke<FileStoreResponse>('file:store', {
                buffer: Buffer.from(buffer),
                fileName: `${Date.now()}-${formData.taxationDocuments!.name}`,
                category: 'shop'
              }, { success: false });

              if (response?.success && response.fullPath) {
                fileResults.taxDocsPath = response.fullPath;
              }
            } catch (error) {
              console.error('Failed to upload taxation documents:', error);
            }
          })
        );
      }

      // Upload ID cards if they exist
      if (formData.nationalIdCardFront) {
        fileUploadPromises.push(
          formData.nationalIdCardFront.arrayBuffer().then(async (buffer) => {
            try {
              const response = await safeIpcInvoke<FileStoreResponse>('file:store', {
                buffer: Buffer.from(buffer),
                fileName: `${Date.now()}-${formData.nationalIdCardFront!.name}`,
                category: 'shop'
              }, { success: false });

              if (response?.success && response.fullPath) {
                fileResults.frontIdPath = response.fullPath;
              }
            } catch (error) {
              console.error('Failed to upload front ID card:', error);
            }
          })
        );
      }

      if (formData.nationalIdCardBack) {
        fileUploadPromises.push(
          formData.nationalIdCardBack.arrayBuffer().then(async (buffer) => {
            try {
              const response = await safeIpcInvoke<FileStoreResponse>('file:store', {
                buffer: Buffer.from(buffer),
                fileName: `${Date.now()}-${formData.nationalIdCardBack!.name}`,
                category: 'shop'
              }, { success: false });

              if (response?.success && response.fullPath) {
                fileResults.backIdPath = response.fullPath;
              }
            } catch (error) {
              console.error('Failed to upload back ID card:', error);
            }
          })
        );
      }

      // Wait for all file uploads to complete
      await Promise.all(fileUploadPromises);

      // Now make the setup account call with the file paths
      const result = await setupAccount({
        businessData: {
          ownerId: user.id,
          fullBusinessName: formData.fullBusinessName,
          businessType: formData.businessType,
          numberOfEmployees: formData.numberOfEmployees,
          taxIdNumber: formData.taxIdNumber || null,
          shopLogo: fileResults.logoPath,
          taxationDocuments: fileResults.taxDocsPath,
          nationalIdCard: fileResults.frontIdPath && fileResults.backIdPath ? {
            front: fileResults.frontIdPath,
            back: fileResults.backIdPath
          } : null,
        },
        locationData: {
          address: useBusinessAddress ? formData.street : formData.shopLocation,
          city: useBusinessAddress ? formData.city : formData.shopCity,
          region: useBusinessAddress ? formData.stateProvince : formData.shopStateProvince,
          country: {
            name: useBusinessAddress ? formData.country : formData.shopCountry
          }
        },
        shopData: {
          name: formData.shopName,
          type: formData.businessType,
          status: 'active',
          contactInfo: {
            email: formData.email,
            phone: formData.phoneNumber
          },
          manager: isManager ? formData.managerName : null,
          isManager: isManager
        },
        userId: user.id
      });

      if (result.success) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Setup failed:', error);
    }
  };

  const steps = [
    {
      number: 1,
      label: "Business Information",
      icon: <Building2 className="w-6 h-6" />
    },
    {
      number: 2,
      label: "Shop Account Details",
      icon: <Store className="w-6 h-6" />
    },
    {
      number: 3,
      label: "Submit",
      icon: <CheckCircle2 className="w-6 h-6" />
    }
  ]

  const togglePasswordVisibility = (field: 'password' | 'reEnterPassword') => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const options = useMemo(() => countryList().getData(), [])

  return (
    <div className="container mx-auto p-6">
      {/* Add back button */}
      <Button
        onClick={() => router.push('/auth/register')}
        variant="ghost"
        className="mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Registration
      </Button>
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex justify-between mb-6">
            {steps.map((s) => (
              <div
                key={s.number}
                className={`flex flex-col items-center ${step >= s.number ? "text-[#2E90FA]" : "text-gray-400"
                  }`}
              >
                <div className={`
                  p-3 rounded-full mb-2
                  ${step >= s.number ? "bg-[#EBF5FF]" : "bg-gray-100"}
                  transition-colors duration-200
                `}>
                  {s.icon}
                </div>
                <span className="text-sm font-medium text-center">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="mb-8">
            <Progress value={(step / 3) * 100} />
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Business Information</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <Label htmlFor="fullBusinessName">Full Business Name</Label>
                    </div>
                    <Input
                      id="fullBusinessName"
                      name="fullBusinessName"
                      value={formData.fullBusinessName}
                      onChange={handleInputChange}
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="w-4 h-4 text-gray-500" />
                      <Label htmlFor="businessType">Business Type</Label>
                    </div>
                    <select
                      id="businessType"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      required
                    >
                      <option value="">Select Business Type</option>
                      {businessTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select
                      id="country"
                      options={options}
                      value={options.find(option => option.value === formData.country)}
                      onChange={(option) => setFormData(prev => ({ ...prev, country: option?.value || '' }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="stateProvince">State/Province/Region</Label>
                    {formData.country ? (
                      <Select
                        id="stateProvince"
                        options={State.getStatesOfCountry(formData.country).map(state => ({
                          value: state.isoCode,
                          label: state.name
                        }))}
                        value={State.getStatesOfCountry(formData.country)
                          .map(state => ({ value: state.isoCode, label: state.name }))
                          .find(option => option.value === formData.stateProvince)}
                        onChange={(option) => setFormData(prev => ({ ...prev, stateProvince: option?.value || '' }))}
                        isClearable
                        placeholder="Select or type state/province/region"
                        noOptionsMessage={() => "Type to enter custom region"}
                      />
                    ) : (
                      <Input
                        id="stateProvince"
                        name="stateProvince"
                        value={formData.stateProvince}
                        onChange={handleInputChange}
                        placeholder="Enter state/province/region"
                      />
                    )}
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Textarea
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                    <Input
                      id="numberOfEmployees"
                      name="numberOfEmployees"
                      type="number"
                      value={formData.numberOfEmployees}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxIdNumber">Tax ID Number</Label>
                    <Input
                      id="taxIdNumber"
                      name="taxIdNumber"
                      value={formData.taxIdNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="shopLogo">Shop Logo</Label>
                    <Input
                      id="shopLogo"
                      name="shopLogo"
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      required
                    />
                    {logoPreview && (
                      <div className="mt-2">
                        <img
                          src={logoPreview}
                          alt="Shop Logo Preview"
                          className="max-w-[200px] max-h-[200px] object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="taxationDocuments">Taxation Documents</Label>
                    <Input
                      id="taxationDocuments"
                      name="taxationDocuments"
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.docx"
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="nationalIdCardFront">National ID Card (Front)</Label>
                    <Input
                      id="nationalIdCardFront"
                      name="nationalIdCardFront"
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nationalIdCardBack">National ID Card (Back)</Label>
                    <Input
                      id="nationalIdCardBack"
                      name="nationalIdCardBack"
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Shop Account Details</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <Label htmlFor="managerName">Manager Name</Label>
                    </div>
                    <Input
                      id="managerName"
                      name="managerName"
                      value={formData.managerName}
                      onChange={handleInputChange}
                      required
                    />
                    {validationErrors.managerName && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.managerName}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                    </div>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required
                    />
                    {validationErrors.phone && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                    {validationErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input
                      id="shopName"
                      name="shopName"
                      value={formData.shopName}
                      onChange={handleInputChange}
                      required
                    />
                    {validationErrors.shopName && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.shopName}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Shop Address</h3>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch
                        id="useBusinessAddress"
                        checked={useBusinessAddress}
                        onCheckedChange={(checked) => {
                          setUseBusinessAddress(checked);
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              shopLocation: prev.street,
                              city: prev.city,
                              country: prev.country,
                              stateProvince: prev.stateProvince
                            }));
                          }
                        }}
                      />
                      <Label htmlFor="useBusinessAddress">Use business address for shop location</Label>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <Label htmlFor="street">Street Address</Label>
                    </div>
                    <Textarea
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter complete street address"
                      disabled={useBusinessAddress}
                    />
                    {validationErrors.address && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.address}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="stateProvince">State/Province/Region</Label>
                    {formData.country ? (
                      <Select
                        id="stateProvince"
                        options={State.getStatesOfCountry(formData.country).map(state => ({
                          value: state.isoCode,
                          label: state.name
                        }))}
                        value={State.getStatesOfCountry(formData.country)
                          .map(state => ({ value: state.isoCode, label: state.name }))
                          .find(option => option.value === formData.stateProvince)}
                        onChange={(option) => setFormData(prev => ({ ...prev, stateProvince: option?.value || '' }))}
                        isClearable
                        placeholder="Select or type state/province/region"
                        noOptionsMessage={() => "Type to enter custom region"}
                        isDisabled={useBusinessAddress}
                      />
                    ) : (
                      <Input
                        id="stateProvince"
                        name="stateProvince"
                        value={formData.stateProvince}
                        onChange={handleInputChange}
                        placeholder="Enter state/province/region"
                        disabled={useBusinessAddress}
                      />
                    )}
                    {validationErrors.state && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.state}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter city"
                      disabled={useBusinessAddress}
                    />
                    {validationErrors.city && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select
                      id="country"
                      options={options}
                      value={options.find(option => option.value === formData.country)}
                      onChange={(option) => setFormData(prev => ({ ...prev, country: option?.value || '' }))}
                      isDisabled={useBusinessAddress}
                    />
                    {validationErrors.country && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.country}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="isManager"
                      checked={isManager}
                      onCheckedChange={setIsManager}
                    />
                    <Label htmlFor="isManager">I am the manager of this shop</Label>
                  </div>

                  {!isManager && (
                    <>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showPassword.password ? "text" : "password"}
                            value={formData.password}
                            onChange={handleInputChange}
                            required={!isManager}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('password')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPassword.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {validationErrors.password && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="reEnterPassword">Re-enter Password</Label>
                        <div className="relative">
                          <Input
                            id="reEnterPassword"
                            name="reEnterPassword"
                            type={showPassword.reEnterPassword ? "text" : "password"}
                            value={formData.reEnterPassword}
                            onChange={handleInputChange}
                            required={!isManager}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('reEnterPassword')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPassword.reEnterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {validationErrors.reEnterPassword && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.reEnterPassword}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="managerEmail">Manager Email</Label>
                        <Input
                          id="managerEmail"
                          name="managerEmail"
                          type="email"
                          value={formData.managerEmail}
                          onChange={handleInputChange}
                          required={!isManager}
                        />
                        {validationErrors.managerEmail && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.managerEmail}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Verify Information & Submit</h2>
                <p className="text-gray-600 mb-4">Please review your information before submitting:</p>

                <Card className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Business Details
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p><span className="font-medium">Business Name:</span> {formData.fullBusinessName}</p>
                          {validationErrors.businessName && (
                            <p className="text-red-500 text-sm">{validationErrors.businessName}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">Business Type:</span> {formData.businessType}</p>
                          {validationErrors.businessType && (
                            <p className="text-red-500 text-sm">{validationErrors.businessType}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">Tax ID:</span> {formData.taxIdNumber}</p>
                          {validationErrors.taxId && (
                            <p className="text-red-500 text-sm">{validationErrors.taxId}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">Employees:</span> {formData.numberOfEmployees}</p>
                          {validationErrors.employees && (
                            <p className="text-red-500 text-sm">{validationErrors.employees}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Shop Details
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p><span className="font-medium">Shop Name:</span> {formData.shopName}</p>
                          {validationErrors.shopName && (
                            <p className="text-red-500 text-sm">{validationErrors.shopName}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">Manager:</span> {formData.managerName}</p>
                          {validationErrors.managerName && (
                            <p className="text-red-500 text-sm">{validationErrors.managerName}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">Email:</span> {formData.email}</p>
                          {validationErrors.email && (
                            <p className="text-red-500 text-sm">{validationErrors.email}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">Phone:</span> {formData.phoneNumber}</p>
                          {validationErrors.phone && (
                            <p className="text-red-500 text-sm">{validationErrors.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location Details
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p><span className="font-medium">Address:</span> {useBusinessAddress ? formData.street : formData.shopLocation}</p>
                          {validationErrors.address && (
                            <p className="text-red-500 text-sm">{validationErrors.address}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">City:</span> {useBusinessAddress ? formData.city : formData.shopCity}</p>
                          {validationErrors.city && (
                            <p className="text-red-500 text-sm">{validationErrors.city}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">State/Province:</span> {useBusinessAddress ? formData.stateProvince : formData.shopStateProvince}</p>
                          {validationErrors.state && (
                            <p className="text-red-500 text-sm">{validationErrors.state}</p>
                          )}
                        </div>
                        <div>
                          <p><span className="font-medium">Country:</span> {useBusinessAddress ? formData.country : formData.shopCountry}</p>
                          {validationErrors.country && (
                            <p className="text-red-500 text-sm">{validationErrors.country}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex items-center space-x-2 bg-blue-50 p-4 rounded-lg">
                  <Checkbox 
                    id="terms" 
                    required
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        setValidationErrors(prev => ({
                          ...prev,
                          terms: "You must accept the terms to continue"
                        }));
                      } else {
                        setValidationErrors(prev => {
                          const { terms, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I confirm that all provided information is accurate and all uploaded documents are clear and valid.
                  </Label>
                </div>
                {validationErrors.terms && (
                  <p className="text-red-500 text-sm mt-2">{validationErrors.terms}</p>
                )}
              </div>
            )}

            <div className="flex justify-between mt-8">
              {step > 1 && (
                <Button
                  type="button"
                  onClick={handlePrev}
                  variant="outline"
                  className="px-6"
                >
                  Previous
                </Button>
              )}
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="px-6 ml-auto"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="px-6 ml-auto bg-green-600 hover:bg-green-700"
                >
                  Submit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AccountSetup
