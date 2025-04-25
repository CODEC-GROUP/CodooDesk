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
import { ConfirmationDialog } from '@/components/Shared/ui/Modal/confirmation-dialog'



interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
  country: string;
  shopId: string;
  businessId: string;
  inventoryItems: {
    id: string;
    product_id: string;
    quantity_supplied: number;
    cost_price: number;
    selling_price: number;
    quantity_left: number;
    product?: {
      id: string;
      name: string;
    };
  }[];
  createdAt: Date;
  updatedAt: Date;
}

interface NewSupplier {
  name: string;
  phone: string;
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
  const { business, user } = useAuthLayout();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<NewSupplier>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    region: "",
    country: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<any>(null);
  const [selectedShopId, setSelectedShopId] = useState("all");

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        if (!business) return;
        
        setIsLoading(true);
        const shopIds = (user?.role === 'admin' || user?.role === 'shop_owner')
          ? business?.shops?.map(shop => shop.id) || []
          : [business?.shops?.[0]?.id].filter(Boolean) as string[];

        const response = await safeIpcInvoke<SuppliersListResponse>('entities:supplier:get-all', {
          shopIds
        }, { success: false, suppliers: [] });

        if (response?.success) {
          const receivedSuppliers = response.suppliers || [];
          const formattedSuppliers = receivedSuppliers.map(supplier => ({
            ...supplier,
            createdAt: new Date(supplier.createdAt),
            updatedAt: new Date(supplier.updatedAt),
            inventoryItems: supplier.inventoryItems?.map(item => ({
              ...item,
              quantity_supplied: Number(item.quantity_supplied) || 0,
              cost_price: Number(item.cost_price) || 0,
              selling_price: Number(item.selling_price) || 0,
              quantity_left: Number(item.quantity_left) || 0
            })) || []
          }));
          
          setSuppliers(formattedSuppliers);
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
  }, [business, user?.role]);

  const calculateSupplierSales = (supplier: Supplier) => {
    return supplier.inventoryItems?.reduce((total, item) => {
      return total + (item.cost_price * item.quantity_supplied);
    }, 0) || 0;
  };

  const calculateTotalItems = (supplier: Supplier) => {
    return supplier.inventoryItems?.length || 0;
  };

  const filteredSuppliers = suppliers.filter((supplier: Supplier) => {
    const matchesSearch = (
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone?.includes(searchTerm) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      [supplier.address, supplier.city, supplier.region, supplier.country]
        .filter(Boolean)
        .join(', ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    const matchesShop = selectedShopId === 'all' || supplier.shopId === selectedShopId;
    return matchesSearch && matchesShop;
  });

  const currentSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('New Supplier Data:', newSupplier);

      const response = await safeIpcInvoke<SupplierResponse>(
        isEditing ? 'entities:supplier:update' : 'entities:supplier:create',
        {
          supplierData: {
            ...newSupplier,
            shopId: selectedShopId === 'all' 
              ? business?.shops?.[0]?.id 
              : selectedShopId,
            businessId: business?.id
          }
        }
      );

      if (response?.success && response.supplier) {
        // Format the supplier data before updating state
        const formattedSupplier = {
          ...response.supplier,
          createdAt: new Date(response.supplier.createdAt),
          updatedAt: new Date(response.supplier.updatedAt),
          // Format any other date fields
        };

        setSuppliers(prevSuppliers => {
          if (isEditing) {
            return prevSuppliers.map(supplier => 
              supplier.id === editingId ? formattedSupplier : supplier
            );
          }
          return [...prevSuppliers, formattedSupplier];
        });

        handleDialogClose();
        toast({
          title: "Success",
          description: `Supplier ${isEditing ? 'updated' : 'added'} successfully`,
        });
      } else {
        throw new Error(response?.message || `Failed to ${isEditing ? 'update' : 'add'} supplier`);
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
      phone: "",
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
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
      region: supplier.region,
      country: supplier.country
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSupplier = async () => {
    try {
      if (!supplierToDelete) return;

      const response = await safeIpcInvoke<SupplierResponse>(
        'entities:supplier:delete', 
        { id: supplierToDelete.id }
      );

      if (response?.success) {
        setSuppliers(prevSuppliers => 
          prevSuppliers.filter(supplier => supplier.id !== supplierToDelete.id)
        );
        toast({
          title: "Success",
          description: "Supplier deleted successfully",
        });
      } else {
        throw new Error(response?.message || 'Failed to delete supplier');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete supplier",
        variant: "destructive",
      });
    } finally {
      setSupplierToDelete(null);
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

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditing(false);
    setEditingId(null);
    resetNewSupplier();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        Loading suppliers...
      </div>
    );
  }

  if (!isLoading && (!suppliers || suppliers.length === 0)) {
    return (
      <>
        <div className="h-full">
          <EmptyState onAddSupplier={() => {
            setIsDialogOpen(true);
            setIsEditing(false);
            setNewSupplier({
              name: "",
              phone: "",
              email: "",
              address: "",
              city: "",
              region: "",
              country: ""
            });
          }} />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSupplier}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    required
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
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
                    required
                    value={newSupplier.city}
                    onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    required
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  {isEditing ? 'Update Supplier' : 'Add Supplier'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
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
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Total Items</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentSuppliers.map((supplier: any) => {
                const dataValues = supplier.dataValues || supplier;
                return (
                  <TableRow key={dataValues.id}>
                    <TableCell>{dataValues.name}</TableCell>
                    <TableCell>{dataValues.email}</TableCell>
                    <TableCell>{dataValues.phone}</TableCell>
                    <TableCell
                      className="max-w-[200px] truncate"
                      title={[dataValues.address, dataValues.city, dataValues.region, dataValues.country].filter(Boolean).join(', ')}
                    >
                      {formatLocation(dataValues)}
                    </TableCell>
                    <TableCell>{calculateTotalItems(dataValues)}</TableCell>
                    <TableCell>{calculateSupplierSales(dataValues).toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditSupplier(dataValues)}
                          aria-label="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSupplierToDelete(dataValues)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSupplier}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  required
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
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
                  required
                  value={newSupplier.city}
                  onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  required
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">
                {isEditing ? 'Update Supplier' : 'Add Supplier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
        description={`Are you sure you want to delete ${supplierToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

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
