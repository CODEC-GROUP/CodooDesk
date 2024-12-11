/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/Shared/ui/dialog"
import { Label } from "@/components/Shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { ArrowLeft, ArrowRight, Search, Plus, Edit, Trash2, FileDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { IncomeAttributes } from '@/models/Income';
import { OhadaCodeAttributes } from '@/models/OhadaCode';
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import EmptyState from './EmptyState';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';

// Income types based on OHADA accounting system
export const incomeTypes = {
  SALES: { code: "701", name: "Sales of Goods", description: "Ventes de marchandises" },
  SERVICES: { code: "706", name: "Services Revenue", description: "Prestations de services" },
  DISCOUNTS: { code: "709", name: "Discounts and Rebates", description: "Remises, rabais, et ristournes accordés" },
  LATE_INTEREST: { code: "762", name: "Late Payment Interest", description: "Intérêts de retard sur paiements" },
  RENTAL: { code: "704", name: "Rental Income", description: "Revenus locatifs" },
  SUBSIDIES: { code: "775", name: "Subsidies and Grants", description: "Subventions et aides" },
  COMMISSION: { code: "706", name: "Commission Income", description: "Revenus de commissions" },
  ASSET_SALES: { code: "775", name: "Asset Sale Gains", description: "Gains sur cession d'immobilisations" },
  INVESTMENT: { code: "764", name: "Investment Income", description: "Revenus des placements" },
  OTHER: { code: "707", name: "Other Operating Income", description: "Autres produits d'exploitation" },
  FOREX: { code: "766", name: "Foreign Exchange Gains", description: "Gains de change" }
}

// OHADA codes for custom categories
export const ohadaIncomeCodes = {
  "701": { code: "701", description: "Sales of goods for resale" },
  "704": { code: "704", description: "Rental income" },
  "706": { code: "706", description: "Revenue from services rendered" },
  "707": { code: "707", description: "Miscellaneous operating income" },
  "709": { code: "709", description: "Discounts and rebates on sales" },
  "762": { code: "762", description: "Interest earned on delayed payments" },
  "764": { code: "764", description: "Investment income" },
  "766": { code: "766", description: "Foreign exchange gains" },
  "775": { code: "775", description: "Operating grants and gains from asset sales" }
}

// Mock data for income entries
const initialIncomeEntries: IncomeEntry[] = [
  { id: 1, date: "2023-01-01", description: "Product Sales", amountPaid: "4,000 XAF", source: "Sales", paymentMethod: "Cash" },
  { id: 2, date: "2023-01-01", description: "Service Revenue", amountPaid: "70,000 XAF", source: "Services", paymentMethod: "Bank Transfer" },
  // Add more mock data here...
]

interface OhadaCodeResponse {
  success: boolean;
  codes?: OhadaCodeAttributes[];
  code?: OhadaCodeAttributes;
  message?: string;
}

interface IncomeResponse {
  success: boolean;
  incomes?: IncomeAttributes[];
  income?: IncomeAttributes;
  message?: string;
}

interface CreateIncomeRequest {
  data: Omit<IncomeAttributes, 'id'>;
}

interface CreateOhadaCodeRequest {
  data: {
    code: string;
    name: string;
    description: string;
    type: 'income';
    classification: 'Custom';
  };
}

interface IncomeEntry {
  id: number;
  date: string;
  description: string;
  amountPaid: string;
  source: string;
  sourceCode?: string;
  paymentMethod: string;
}

interface NewIncomeItem {
  date?: string;
  description?: string;
  amount?: string;
  paymentMethod?: string;
  ohadaCodeId?: string;
  isCustom?: boolean;
}

const Income = () => {
  const { user, business } = useAuthLayout();
  const [incomes, setIncomes] = useState<IncomeAttributes[]>([]);
  const [ohadaCodes, setOhadaCodes] = useState<OhadaCodeAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState<NewIncomeItem>({})
  const [selectedShopId, setSelectedShopId] = useState<string>("");

  const [selectedOhadaCode, setSelectedOhadaCode] = useState<string>("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  const handleOhadaCodeSelection = (value: string) => {
    setSelectedOhadaCode(value);
    setNewItem({ ...newItem, ohadaCodeId: value });
  };

  const handleCustomCategoryToggle = (checked: boolean) => {
    setIsCustomCategory(checked);
    if (!checked) {
      // Reset to regular OHADA code selection if custom category is disabled
      setNewItem({ ...newItem, isCustom: false });
      setCustomCategoryName("");
      setSelectedOhadaCode("");
    } else {
      setNewItem({ ...newItem, isCustom: true });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch OHADA codes for income
        const codesResponse = await safeIpcInvoke<OhadaCodeResponse>(
          'finance:ohada-codes:get-by-type',
          { type: 'income' },
          { success: false }
        );

        if (codesResponse?.success && codesResponse.codes) {
          setOhadaCodes(codesResponse.codes);
        } else {
          toast({
            title: "Error",
            description: codesResponse?.message || 'Failed to load OHADA codes',
            variant: "destructive",
          });
        }

        // Fetch incomes with associated OHADA codes
        const incomesResponse = await safeIpcInvoke<IncomeResponse>(
          'finance:income:get-all',
          {},
          { success: false }
        );

        if (incomesResponse?.success && incomesResponse.incomes) {
          setIncomes(incomesResponse.incomes);
        } else {
          toast({
            title: "Error",
            description: incomesResponse?.message || 'Failed to load incomes',
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: 'Failed to load data',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddItem = async () => {
    try {
      let ohadaCodeId = newItem.ohadaCodeId;

      // If custom category is enabled and filled out, create it first
      if (newItem.isCustom && selectedOhadaCode && customCategoryName) {
        // Find the selected OHADA code details
        const selectedCode = ohadaCodes.find(code => code.id === selectedOhadaCode);
        if (!selectedCode) {
          toast({
            title: "Error",
            description: "Selected OHADA code not found",
            variant: "destructive",
          });
          return;
        }

        const createOhadaCodeRequest: CreateOhadaCodeRequest = {
          data: {
            code: selectedCode.code,
            name: customCategoryName,
            description: selectedCode.description,
            type: 'income',
            classification: 'Custom'
          }
        };

        const response = await safeIpcInvoke<OhadaCodeResponse>(
          'finance:ohada-codes:create',
          createOhadaCodeRequest,
          { success: false }
        );

        if (!response?.success || !response.code?.id) {
          toast({
            title: "Error",
            description: response?.message || 'Failed to create custom category',
            variant: "destructive",
          });
          return;
        }

        // Use the newly created OHADA code's ID
        ohadaCodeId = response.code.id;
      }

      // Proceed with creating the income
      if (!ohadaCodeId || !newItem.date || !newItem.description || !newItem.amount || !newItem.paymentMethod) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const createIncomeRequest: CreateIncomeRequest = {
        data: {
          date: new Date(newItem.date || Date.now()),
          description: newItem.description,
          amount: parseFloat(newItem.amount),
          paymentMethod: newItem.paymentMethod,
          ohadaCodeId: ohadaCodeId,
          userId: user?.id,
          shopId: selectedShopId || undefined,
        }
      };

      const response = await safeIpcInvoke<IncomeResponse>(
        'finance:income:create',
        createIncomeRequest,
        { success: false }
      );

      if (response?.success && response.income) {
        // Format the new income data before adding to state
        const formattedIncome = {
          ...response.income,
          date: new Date(response.income.date),
          ohadaCode: response.income.ohadaCode, // Ensure ohadaCode is included
          shopId: response.income.shopId // Change 'shop' to 'shopId'
        };

        // Update the incomes state with the new formatted income
        setIncomes(prevIncomes => {
          const updatedIncomes = [...prevIncomes];
          const existingIndex = updatedIncomes.findIndex(income => income.id === formattedIncome.id);

          if (existingIndex >= 0) {
            // Update existing income
            updatedIncomes[existingIndex] = formattedIncome;
          } else {
            // Add new income
            updatedIncomes.push(formattedIncome);
          }

          return updatedIncomes;
        });

        setIsAddDialogOpen(false);
        setNewItem({});
        setSelectedOhadaCode("");
        setCustomCategoryName("");
        setIsCustomCategory(false);

        toast({
          title: "Success",
          description: "Income added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to create income',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: "Error",
        description: 'Failed to add income',
        variant: "destructive",
      });
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    try {
      const response = await safeIpcInvoke<{ success: boolean; message?: string }>('finance:income:delete', {
        incomeId
      }, { success: false });

      if (response?.success) {
        setIncomes(incomes.filter(inc => inc.id !== incomeId));
        toast({
          title: "Success",
          description: "Income deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to delete income',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: "Error",
        description: 'Failed to delete income',
        variant: "destructive",
      });
    }
  };

  const filteredItems = incomes.filter((item: any) => {
    const dataValues = item.dataValues || item;
    return dataValues.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const currentItems = filteredItems.slice((currentPage - 1) * 10, currentPage * 10)
  const totalPages = Math.ceil(filteredItems.length / 10)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  const handleCheckboxChange = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Income</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Income
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Income</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newItem.date}
                    onChange={(e) =>
                      setNewItem({ ...newItem, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={newItem.amount}
                    onChange={(e) =>
                      setNewItem({ ...newItem, amount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={newItem.paymentMethod}
                    onValueChange={(value) =>
                      setNewItem({ ...newItem, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Shop Selection for admin/shop owner */}
                {(user?.role === 'admin' || user?.role === 'shop_owner') && business?.shops && business.shops.length > 0 && (
                  <div>
                    <Label>Shop (Optional)</Label>
                    <Select
                      value={selectedShopId}
                      onValueChange={setSelectedShopId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-shop">No Shop</SelectItem>
                        {business.shops.map((shop: any) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Source</Label>
                  {!isCustomCategory ? (
                    <Select
                      value={selectedOhadaCode}
                      onValueChange={handleOhadaCodeSelection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Source Code" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {ohadaCodes.map((code: any) => (
                          <SelectItem key={code.dataValues.id} value={code.dataValues.id as string}>
                            {code.dataValues.code} - {code.dataValues.name}
                            <span className="block text-sm text-gray-500">{code.dataValues.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  {/* <div className="mt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="customCategory"
                        checked={isCustomCategory}
                        onCheckedChange={handleCustomCategoryToggle}
                      />
                      <Label htmlFor="customCategory">Add Custom Category</Label>
                    </div>

                    {isCustomCategory && (
                      <div className="mt-2 space-y-4">
                        <Select
                          value={selectedOhadaCode}
                          onValueChange={handleOhadaCodeSelection}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select OHADA Code for Custom Category" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {ohadaCodes.map((code: any) => (
                              <SelectItem key={code.dataValues.id} value={code.dataValues.id as string}>
                                {code.dataValues.code} - {code.dataValues.name}
                                <span className="block text-sm text-gray-500">{code.dataValues.description}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="space-y-2">
                          <Label>Category Name</Label>
                          <Input
                            placeholder="Enter custom category name"
                            value={customCategoryName}
                            onChange={(e) => {
                              setCustomCategoryName(e.target.value);
                              setNewItem({
                                ...newItem,
                                description: e.target.value,
                                ohadaCodeId: selectedOhadaCode
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div> */}
                </div>
                <Button onClick={handleAddItem}>Add Income</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : incomes.length === 0 ? (
        <EmptyState onAddClick={() => setIsAddDialogOpen(true)} />
      ) : (
        <div className="space-y-4">
          {/* Search and Filter Section */}
          <div className="flex items-center py-4">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Income</SelectItem>
                {ohadaCodes.map((code: any) => (
                  <SelectItem key={code.dataValues.id} value={code.dataValues.id as string}>
                    {code.dataValues.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search..."
              value={searchTerm ?? ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ml-2"
            />
            <Button variant="ghost" className="ml-2">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedItems.length === currentItems.length}
                      onCheckedChange={() => {
                        if (selectedItems.length === currentItems.length) {
                          setSelectedItems([])
                        } else {
                          setSelectedItems(currentItems.map(item => item.id).filter((id): id is string => id !== undefined))
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((item: any) => {
                  const dataValues = item.dataValues || item;
                  return (
                    <TableRow key={dataValues.id}>
                      <TableCell>
                        <Checkbox
                          checked={dataValues.id ? selectedItems.includes(dataValues.id) : false}
                          onCheckedChange={() => dataValues.id && handleCheckboxChange(dataValues.id)}
                        />
                      </TableCell>
                      <TableCell>{new Date(dataValues.date).toLocaleDateString()}</TableCell>
                      <TableCell>{dataValues.description}</TableCell>
                      <TableCell>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(dataValues.amount)}</TableCell>
                      <TableCell>{dataValues.ohadaCode?.name || 'Unknown'}</TableCell>
                      <TableCell style={{ textTransform: 'capitalize' }}>{dataValues.paymentMethod?.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteIncome(dataValues.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => handlePageChange(page)}
                    className={currentPage === page
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Income
