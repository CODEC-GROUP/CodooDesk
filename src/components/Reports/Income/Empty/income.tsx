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
import { ArrowLeft, ArrowRight, Search, Plus, Edit, Trash2, FileDown, ListFilter, Store } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { IncomeAttributes } from '@/models/Income';
import { OhadaCodeAttributes } from '@/models/OhadaCode';
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import EmptyState from './EmptyState';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';
import { ConfirmationDialog } from '@/components/Shared/ui/Modal/confirmation-dialog'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandList,
  CommandGroup,
  CommandInput,
  CommandItem
} from "@/components/ui/command"
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/Shared/ui/dropdown-menu"

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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Non-hook version of formatCurrency for export functionality
const formatCurrencyForExport = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const Income = () => {
  const { user, business, availableShops } = useAuthLayout();
  const [incomes, setIncomes] = useState<IncomeAttributes[]>([]);
  const [ohadaCodes, setOhadaCodes] = useState<OhadaCodeAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState<NewIncomeItem>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    paymentMethod: 'cash',
    ohadaCodeId: '',
    isCustom: false
  });
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [filterValue, setFilterValue] = useState("all");

  const [selectedOhadaCode, setSelectedOhadaCode] = useState<string>("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<any>(null);

  const [filteredIncomes, setFilteredIncomes] = useState<IncomeAttributes[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const ITEMS_PER_PAGE = itemsPerPage;

  // Add useEffect for filtering
  useEffect(() => {
    let result = [...incomes];
    
    // Shop filter for admin/shop_owner
    if (user?.role === 'admin' || user?.role === 'shop_owner') {
      if (filterValue !== 'all') {
        result = result.filter(income => income.shopId === filterValue);
      }
    }
    
    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter(income => 
        income.description?.toLowerCase().includes(searchLower) ||
        formatCurrency(Number(income.amount)).toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredIncomes(result);
  }, [incomes, filterValue, searchTerm, user?.role]);

  // Update pagination calculations
  const totalFilteredItems = filteredIncomes.length;
  const totalPages = Math.ceil(totalFilteredItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filteredIncomes.slice(startIndex, endIndex);

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

        // Add business check first
        if (!business?.id) {
          console.error('No business configured');
          toast({
            title: "Error",
            description: "Business configuration not loaded",
            variant: "destructive",
          });
          return;
        }

        // Improved user check
        if (!user?.id) {
          console.error('No user found');
          toast({
            title: "Error",
            description: "User not authenticated",
            variant: "destructive",
          });
          return;
        }

        // Determine shop IDs based on selection and role
        let requestShopId = null;
        let requestShopIds = null;

        if (selectedShopId) {
          // If specific shop is selected, use that
          requestShopId = selectedShopId;
        } else if (user.role === 'admin' || user.role === 'shop_owner') {
          // For admin/owner without specific shop selected, use all available shop IDs
          requestShopIds = business.shops?.map(shop => shop.id);
        } else {
          // For regular employees, use their assigned shop
          requestShopId = availableShops?.[0]?.id;
        }

        // Validate shop ID requirement
        if (!requestShopId && (!requestShopIds || requestShopIds.length === 0)) {
          console.error('No shop IDs available');
          toast({
            title: "Error",
            description: "No shops available - configure shops first",
            variant: "destructive",
          });
          return;
        }
        
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
          {
            userId: user.id,
            userRole: user.role,
            shopId: requestShopId,
            shopIds: requestShopIds
          },
          { success: false }
        );

        if (incomesResponse?.success && incomesResponse.incomes) {
          setIncomes(incomesResponse.incomes);
        } else {
          setIncomes([]);
          toast({
            title: "Error",
            description: incomesResponse?.message || 'Failed to load incomes',
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setIncomes([]);
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
  }, [user, business, selectedShopId, availableShops]);

  const handleAddItem = async () => {
    try {
      let ohadaCodeId = newItem.ohadaCodeId;
      
      // Get shop ID based on user role
      const shopIdToUse = (user?.role === 'admin' || user?.role === 'shop_owner')
        ? selectedShopId
        : availableShops?.[0]?.id;

      if (!shopIdToUse) {
        toast({
          title: "Error",
          description: "No shop selected",
          variant: "destructive",
        });
        return;
      }

      // Basic validation first
      if (!newItem.date || !newItem.description || !newItem.amount || !newItem.paymentMethod) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // If not custom category, validate OHADA code
      if (!newItem.isCustom && !ohadaCodeId) {
        toast({
          title: "Error",
          description: "Please select a category",
          variant: "destructive",
        });
        return;
      }

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

        const createOhadaCodeRequest = {
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

        ohadaCodeId = response.code.id;
      }

      const createIncomeRequest = {
        data: {
          date: new Date(newItem.date),
          description: newItem.description,
          amount: parseFloat(newItem.amount),
          paymentMethod: newItem.paymentMethod,
          ohadaCodeId: ohadaCodeId,
          userId: user?.id,
          shopId: shopIdToUse,
        }
      };

      const response = await safeIpcInvoke<IncomeResponse>(
        'finance:income:create',
        createIncomeRequest,
        { success: false }
      );

      if (response?.success && response.income) {
        // Reset form state first
        setIsAddDialogOpen(false);
        setNewItem({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          paymentMethod: 'cash',
          ohadaCodeId: '',
          isCustom: false
        });
        setSelectedOhadaCode("");
        setCustomCategoryName("");
        setIsCustomCategory(false);

        // Update incomes list with the new income at the beginning
        const newIncome = response.income as unknown as IncomeAttributes;
        setIncomes(prevIncomes => [newIncome, ...prevIncomes]);
        setFilteredIncomes(prevFiltered => [newIncome, ...prevFiltered]);

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

  const handleEditClick = (income: any) => {
    const dataValues = income.dataValues || income;
    setEditingIncome({
      ...dataValues,
      date: new Date(dataValues.date).toISOString().split('T')[0],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateIncome = async () => {
    try {
      if (!editingIncome.id) return;

      const updateIncomeRequest = {
        id: editingIncome.id,
        data: {
          date: new Date(editingIncome.date),
          description: editingIncome.description,
          amount: parseFloat(editingIncome.amount),
          paymentMethod: editingIncome.paymentMethod,
          ohadaCodeId: editingIncome.ohadaCodeId,
          shopId: editingIncome.shopId
        }
      };

      const response = await safeIpcInvoke<IncomeResponse>(
        'finance:income:update',
        updateIncomeRequest
      );

      if (response?.success && response.income) {
        // Format the updated income data
        const formattedIncome = {
          ...response.income,
          date: new Date(response.income.date),
          ohadaCode: response.income.ohadaCode
        };
        
        // Update incomes state with the formatted income
        setIncomes(prevIncomes =>
          prevIncomes.map(inc => 
            inc.id === editingIncome.id ? formattedIncome : inc
          )
        );
        
        // Reset edit state
        setIsEditDialogOpen(false);
        setEditingIncome(null);
        
        toast({
          title: "Success",
          description: "Income updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to update income',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating income:', error);
      toast({
        title: "Error",
        description: 'Failed to update income',
        variant: "destructive",
      });
    }
  };

  const handleDeleteIncome = async () => {
    try {
      if (!incomeToDelete) return;

      const response = await safeIpcInvoke<IncomeResponse>(
        'finance:income:delete',
        { id: incomeToDelete.id }
      );

      if (response?.success) {
        setIncomes(prevIncomes => 
          prevIncomes.filter(inc => inc.id !== incomeToDelete.id)
        );
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
    } finally {
      setIncomeToDelete(null);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Update the search input to handle empty values properly
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // Check if income data exists
      if (!currentItems || currentItems.length === 0) {
        toast({
          title: "Export Failed",
          description: "No data available to export",
          variant: "destructive",
        });
        return;
      }

      const shopName = business?.fullBusinessName?.replace(/[^a-z0-9]/gi, '_') || 'Business';
      const dateString = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

      // Common data preparation
      const headers = ['Date', 'Description', 'Amount', 'Payment Method', 'Category'];
      const data = currentItems.map((item: IncomeAttributes) => ([
        item.date ? new Date(item.date).toLocaleDateString() : 'N/A',
        item.description || 'N/A',
        formatCurrencyForExport(Number(item.amount)),
        item.paymentMethod?.replace('_', ' ') || 'N/A',
        item.ohadaCode?.name || 'Unknown'
      ])) as unknown as RowInput[];

      if (format === 'csv' || format === 'excel') {
        const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const fileExtension = format === 'csv' ? 'csv' : 'xlsx';
        
        // Create CSV content with proper escaping
        const csvContent = [headers, ...data]
          .map(row => {
            if (Array.isArray(row)) {
              return row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"')) {
                  return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
              }).join(',');
            }
            return '';
          })
          .join('\n');
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shopName}_Income_${dateString}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: `${format.toUpperCase()} file has been generated`,
          variant: "default",
        });
      }

      if (format === 'pdf') {
        try {
          // Create PDF document
          const doc = new jsPDF('l', 'mm', 'a4');
          doc.setFont('helvetica', 'normal');
          
          // Title Section
          doc.setFontSize(18);
          doc.text(`${shopName} - Income Report`, 14, 20);
          doc.setFontSize(10);
          doc.setTextColor(100);
          
          // Business Info
          if (business) {
            doc.text(`Business: ${business.fullBusinessName || 'N/A'}`, 14, 28);
            business.address && doc.text(`Address: ${business.address}`, 14, 33);
          }
          
          // Table
          autoTable(doc, {
            head: [headers.map(h => h.toUpperCase())],
            body: data,
            startY: business ? 40 : 25,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [55, 65, 81], textColor: 255 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { horizontal: 14 },
          });

          // Footer
          const pageCount = (doc as any).getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(
              `Generated on ${new Date().toLocaleString()}`,
              14,
              doc.internal.pageSize.height - 10
            );
            doc.text(
              `Page ${i} of ${pageCount}`,
              doc.internal.pageSize.width - 25,
              doc.internal.pageSize.height - 10
            );
          }

          // Save the PDF
          doc.save(`${shopName}_Income_${dateString}.pdf`);
          
          toast({
            title: "Export Successful",
            description: "PDF report generated with income details",
            variant: "default",
          });
        } catch (pdfError) {
          console.error('PDF Generation Error:', pdfError);
          toast({
            title: "PDF Error",
            description: "Failed to generate PDF document",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Export Failed:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate export file. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Income</h2>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  <Label>Amount ({formatCurrency(0)})</Label>
                  <Input
                    type="number"
                    value={newItem.amount}
                    onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                    placeholder="Enter amount"
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
                    <Label>Shop</Label>
                    <Select
                      value={selectedShopId}
                      onValueChange={setSelectedShopId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
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
                        {ohadaCodes.map((code : any) => (
                          <SelectItem key={code.dataValues.id} value={code.dataValues.id as string}>
                            {code.dataValues.code} - {code.dataValues.name}
                            <span className="block text-sm text-gray-500">{code.dataValues.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
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
        <>
          {/* Filters Section - Update to match OrderList style */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Input
                placeholder="Search income..."
                value={searchTerm}
                onChange={handleSearch}
                className="pr-10"
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-[180px]">
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4" />
                    <SelectValue placeholder="Filter Income" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Income</SelectItem>
                  {ohadaCodes.map((code: any) => (
                    <SelectItem key={code.dataValues.id} value={code.dataValues.id}>
                      {code.dataValues.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(user?.role === 'admin' || user?.role === 'shop_owner') && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px] justify-start">
                    <Store className="mr-2 h-4 w-4" />
                    {selectedShopId ? business?.shops?.find(s => s.id === selectedShopId)?.name : "All Shops"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0">
                  <Command>
                    <CommandInput placeholder="Filter shops..." />
                    <CommandList>
                      <CommandGroup>
                        {business?.shops?.map((shop: any) => (
                          <CommandItem
                            key={shop.id}
                            value={shop.id}
                            onSelect={() => setSelectedShopId(shop.id === selectedShopId ? "" : shop.id)}
                          >
                            <Checkbox
                              checked={selectedShopId === shop.id}
                              className="mr-2"
                            />
                            {shop.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Table Container - Update to use Card */}
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((item) => (
                      <TableRow 
                        key={item.id}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        <TableCell>
                          {new Date(item.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{formatCurrency(Number(item.amount))}</TableCell>
                        <TableCell>{item.ohadaCode?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <span className="capitalize">
                            {item.paymentMethod?.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditClick(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => setIncomeToDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination - Update to match OrderList style */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredIncomes.length)} of {filteredIncomes.length} entries
              </span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmationDialog
        isOpen={!!incomeToDelete}
        onClose={() => setIncomeToDelete(null)}
        onConfirm={handleDeleteIncome}
        title="Delete Income"
        description={`Are you sure you want to delete this income? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editingIncome?.date}
                onChange={(e) =>
                  setEditingIncome({ ...editingIncome, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editingIncome?.description}
                onChange={(e) =>
                  setEditingIncome({ ...editingIncome, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Amount ({formatCurrency(0)})</Label>
              <Input
                type="number"
                value={editingIncome?.amount}
                onChange={(e) =>
                  setEditingIncome({ ...editingIncome, amount: parseFloat(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={editingIncome?.paymentMethod}
                onValueChange={(value) =>
                  setEditingIncome({ ...editingIncome, paymentMethod: value })
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
            <Button onClick={handleUpdateIncome}>Update Income</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Income
