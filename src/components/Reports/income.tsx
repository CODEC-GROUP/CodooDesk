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
}

const Income = () => {
  const [incomes, setIncomes] = useState<IncomeAttributes[]>([]);
  const [ohadaCodes, setOhadaCodes] = useState<OhadaCodeAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState<NewIncomeItem>({})
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState({ 
    name: "", 
    code: "", 
    description: "" 
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch OHADA codes for income
        const codesResponse = await safeIpcInvoke<OhadaCodeResponse>('finance:ohada-codes:get-by-type', { 
          type: 'income' 
        }, { success: false, codes: [] });

        if (codesResponse?.success && codesResponse.codes) {
          setOhadaCodes(codesResponse.codes);
        } else {
          toast({
            title: "Error",
            description: codesResponse?.message || 'Failed to load OHADA codes',
            variant: "destructive",
          });
        }

        // Fetch incomes
        const incomesResponse = await safeIpcInvoke<IncomeResponse>('finance:income:get-all', {}, {
          success: false,
          incomes: []
        });

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

  const handleAddIncome = async (incomeData: Omit<IncomeAttributes, 'id'>) => {
    try {
      const request: CreateIncomeRequest = { data: incomeData };
      const response = await safeIpcInvoke<IncomeResponse>('finance:income:create', 
        request, 
        { success: false }
      );
      
      if (response?.success && response.income) {
        setIncomes([...incomes, response.income]);
        setIsAddDialogOpen(false);
        setNewItem({});
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
      console.error('Error creating income:', error);
      toast({
        title: "Error",
        description: 'Failed to create income',
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

  const handleAddItem = async () => {
    try {
      let ohadaCodeId = newItem.ohadaCodeId;

      if (isCustomCategory) {
        const ohadaRequest: CreateOhadaCodeRequest = {
          data: {
            code: customCategory.code,
            name: customCategory.name,
            description: customCategory.description,
            type: 'income',
            classification: 'Custom',
          }
        };

        const ohadaResponse = await safeIpcInvoke<OhadaCodeResponse>('finance:ohada-codes:create', 
          ohadaRequest, 
          { success: false }
        );

        if (!ohadaResponse?.success || !ohadaResponse.code) {
          toast({
            title: "Error",
            description: ohadaResponse?.message || 'Failed to create custom category',
            variant: "destructive",
          });
          return;
        }

        ohadaCodeId = ohadaResponse.code.id;
      }

      const incomeData: Omit<IncomeAttributes, 'id'> = {
        date: new Date(newItem.date || Date.now()),
        description: newItem.description || '',
        amount: parseFloat(newItem.amount || '0'),
        paymentMethod: newItem.paymentMethod || 'cash',
        ohadaCodeId: ohadaCodeId || '',
      };
      
      await handleAddIncome(incomeData);
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: "Error",
        description: 'Failed to add income',
        variant: "destructive",
      });
    }
  };

  const filteredItems = incomes.filter(item =>
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
    <div className="container mx-auto py-10">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Income</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Income</SelectItem>
                {ohadaCodes.map((code) => (
                  <SelectItem key={code.id} value={code.id || ''}>
                    {code.code} - {code.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search..."
              value={searchTerm}
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
                {currentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={item.id ? selectedItems.includes(item.id) : false}
                        onCheckedChange={() => item.id && handleCheckboxChange(item.id)}
                      />
                    </TableCell>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.amount}</TableCell>
                    <TableCell>{ohadaCodes.find(code => code.id === item.ohadaCodeId)?.name || 'Unknown'}</TableCell>
                    <TableCell>{item.paymentMethod}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Income</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Input
                id="date"
                type="date"
                value={newItem.date || new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input
                id="description"
                value={newItem.description || ""}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input
                id="amount"
                value={newItem.amount || ""}
                onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source" className="text-right">Source</Label>
              <div className="col-span-3">
                <Select 
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setIsCustomCategory(true)
                    } else {
                      setIsCustomCategory(false)
                      setNewItem({ ...newItem, ohadaCodeId: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select income source" />
                  </SelectTrigger>
                  <SelectContent>
                    {ohadaCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id || ''}>
                        {code.code} - {code.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Add Custom Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isCustomCategory ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customName" className="text-right">Source Name</Label>
                  <Input
                    id="customName"
                    value={customCategory.name}
                    onChange={(e) => setCustomCategory(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ohadaCode" className="text-right">OHADA Code</Label>
                  <div className="col-span-3">
                    <Select
                      onValueChange={(value) => {
                        const selectedCode = ohadaCodes.find(code => code.id === value);
                        setCustomCategory(prev => ({
                          ...prev,
                          code: value,
                          description: selectedCode?.description || ''
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select OHADA code" />
                      </SelectTrigger>
                      <SelectContent>
                        {ohadaCodes.map((code) => (
                           <SelectItem key={code.id} value={code.id || ''}>
                            {code.code} - {code.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {customCategory.code && (
                      <p className="text-sm text-gray-500 mt-1">
                        {ohadaCodes.find(code => code.id === customCategory.code)?.description}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <div className="col-span-3">
                  <Select
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setIsCustomCategory(true);
                      } else {
                        const selectedCode = ohadaCodes.find(code => code.id === value);
                        setNewItem(prev => ({ 
                          ...prev, 
                          ohadaCodeId: value,
                          description: selectedCode?.description || ''
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ohadaCodes.map((code) => (
                         <SelectItem key={code.id} value={code.id || ''}>
                          {code.code} - {code.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Category</SelectItem>
                    </SelectContent>
                  </Select>
                  {newItem.ohadaCodeId && (
                    <p className="text-sm text-gray-500 mt-1">
                      {ohadaCodes.find(code => code.id === newItem.ohadaCodeId)?.description}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMethod" className="text-right">Payment Method</Label>
              <div className="col-span-3">
                <Select
                  onValueChange={(value) => setNewItem({ ...newItem, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobileMoney">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button onClick={handleAddItem}>Add Income</Button>
        </DialogContent>
      </Dialog>

      <div className="md:hidden space-y-4">
        {currentItems.map((item) => (
          <Card key={item.id} className="cursor-pointer">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()}</span>
                <span className="font-semibold">{item.amount}</span>
              </div>
              <h3 className="font-medium">{item.description}</h3>
              <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                <span>{ohadaCodes.find(code => code.id === item.ohadaCodeId)?.name || 'Unknown'}</span>
                <span>{item.paymentMethod}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Income
