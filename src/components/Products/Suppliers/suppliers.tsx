/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Shared/ui/dialog"
import { Label } from "@/components/Shared/ui/label"
import { AlertCircle, Edit, Trash2, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import Select from 'react-select'
import countryList from 'react-select-country-list'
import { Country, State } from 'country-state-city'
import { EmptyState } from "./EmptyState"



interface Supplier {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  region: string;
  country: string;
  businessId: string;
  supplierProducts: {
    id: string;
    name: string;
    productCount: number;
    totalValue: number;
  }[];
}

interface NewSupplier {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  region: string;
  country: string;
}



interface SupplierResponse {
  success: boolean;
  supplier?: Supplier;
  message?: string;
}

interface SuppliersListResponse {
  success: boolean;
  suppliers?: Supplier[];
  message?: string;
}

const Suppliers = () => {
  const { business } = useAuthLayout();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<NewSupplier>({
    name: "",
    phoneNumber: "",
    email: "",
    address: "",
    city: "",
    region: "",
    country: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoading(true);
        const businessId = business?.id || JSON.parse(localStorage.getItem('business') || '{}')?.id;
        
        if (!businessId) {
          throw new Error('Business ID is required');
        }

        const response = await safeIpcInvoke<SuppliersListResponse>('entities:supplier:get-all', 
          { businessId }, 
          { success: false, suppliers: [] }
        );

        if (response?.success && response.suppliers) {
          setSuppliers(response.suppliers);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setError(error instanceof Error ? error.message : 'Failed to load suppliers');
        toast({
          title: "Error",
          description: "Failed to load suppliers",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuppliers();
  }, [business?.id]);

  const calculateSupplierSales = (supplier: Supplier) => {
    return supplier.supplierProducts?.reduce((total, product) => total + product.totalValue, 0) || 0;
  };

  const calculateTotalItems = (supplier: Supplier) => {
    return supplier.supplierProducts?.reduce((total, product) => total + product.productCount, 0) || 0;
  };

  const filteredSuppliers = suppliers?.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phoneNumber.includes(searchTerm) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    [supplier.address, supplier.city, supplier.region, supplier.country]
      .filter(Boolean)
      .join(', ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) || [];

  const currentSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleAddSupplier = async () => {
    try {
      const businessId = business?.id || JSON.parse(localStorage.getItem('business') || '{}')?.id;
      
      if (!businessId) {
        throw new Error('Business ID is required');
      }

      const supplierData = {
        ...newSupplier,
        businessId
      };

      if (isEditing && editingId) {
        const response = await safeIpcInvoke<SupplierResponse>('entities:supplier:update', {
          id: editingId,
          updates: supplierData
        }, { success: false });

        if (response?.success && response.supplier) {
          setSuppliers(prev => prev.map(supplier => 
            supplier.id === editingId ? response.supplier! : supplier
          ));
          toast({
            title: "Success",
            description: "Supplier updated successfully",
          });
          setIsDialogOpen(false);
          setIsEditing(false);
          setEditingId(null);
          resetNewSupplier();
        }
      } else {
        const response = await safeIpcInvoke<SupplierResponse>('entities:supplier:create', {
          supplierData
        }, { success: false });

        if (response?.success && response.supplier) {
          setSuppliers(prev => [...prev, response.supplier as Supplier]);
          toast({
            title: "Success",
            description: "Supplier added successfully",
          });
          setIsDialogOpen(false);
          resetNewSupplier();
        }
      }
    } catch (error) {
      console.error('Error adding/updating supplier:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add/update supplier",
        variant: "destructive",
      });
    }
  };

  const resetNewSupplier = () => {
    setNewSupplier({
      name: "",
      phoneNumber: "",
      email: "",
      address: "",
      city: "",
      region: "",
      country: ""
    });
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setIsEditing(true);
    setEditingId(supplier.id);
    setNewSupplier({
      name: supplier.name,
      phoneNumber: supplier.phoneNumber,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
      region: supplier.region,
      country: supplier.country
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const response: SupplierResponse | null = await safeIpcInvoke('entities:supplier:delete', { id });

      if (response && response.success) {
        setSuppliers(suppliers.filter(supplier => supplier.id !== id));
      } else {
        throw new Error(response?.message || 'Failed to delete supplier');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    }
  };

  // Add helper function to format location
  const formatLocation = (supplier: Supplier) => {
    const countryName = Country.getCountryByCode(supplier.country)?.name || supplier.country;
    const regionName = State.getStateByCodeAndCountry(supplier.region, supplier.country)?.name || supplier.region;

    const location = [
      supplier.address,
      supplier.city,
      regionName,
      countryName
    ].filter(Boolean).join(', ');

    return location.length > 30 ? `${location.slice(0, 30)}...` : location;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        Loading suppliers...
      </div>
    );
  }

  if (!isLoading && suppliers.length === 0) {
    return (
      <div className="h-full">
        <EmptyState onAddSupplier={() => {
          setIsDialogOpen(true);
          setIsEditing(false);
          resetNewSupplier();
        }} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <Input
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#1A7DC0] text-white shadow hover:bg-[#1A7DC0]/90 ml-4"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Total Items</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.phoneNumber}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell 
                    className="max-w-[200px] truncate"
                    title={[supplier.address, supplier.city, supplier.region, supplier.country].filter(Boolean).join(', ')}
                  >
                    {formatLocation(supplier)}
                  </TableCell>
                  <TableCell>{calculateTotalItems(supplier)}</TableCell>
                  <TableCell>${calculateSupplierSales(supplier).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSupplier(supplier)}
                        aria-label="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={newSupplier.phoneNumber}
                onChange={(e) => setNewSupplier({ ...newSupplier, phoneNumber: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Select
                id="country"
                options={countryList().getData()}
                value={countryList().getData().find(option => option.value === newSupplier.country)}
                onChange={(option) => setNewSupplier(prev => ({ ...prev, country: option?.value || '' }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              {newSupplier.country ? (
                <Select
                  id="region"
                  options={State.getStatesOfCountry(newSupplier.country).map(state => ({
                    value: state.isoCode,
                    label: state.name
                  }))}
                  value={State.getStatesOfCountry(newSupplier.country)
                    .map(state => ({ value: state.isoCode, label: state.name }))
                    .find(option => option.value === newSupplier.region)}
                  onChange={(option) => setNewSupplier(prev => ({ ...prev, region: option?.value || '' }))}
                  isClearable
                />
              ) : (
                <Input
                  id="region"
                  value={newSupplier.region}
                  onChange={(e) => setNewSupplier({ ...newSupplier, region: e.target.value })}
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={newSupplier.city}
                onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddSupplier}>
              {isEditing ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Suppliers;
