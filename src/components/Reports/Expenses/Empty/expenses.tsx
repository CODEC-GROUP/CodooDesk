"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/Shared/ui/dialog"
import { Label } from "@/components/Shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { ArrowLeft, ArrowRight, Search, Plus, Edit, Trash2, ListFilter, Store } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Shared/ui/card"
import { FileDown } from "lucide-react"
import { OhadaCodeAttributes } from '@/models/OhadaCode';
import { ExpenseAttributes } from '@/models/Expense';
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import EmptyState from './EmptyState';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';
import {
  Command,
  CommandList,
  CommandGroup,
  CommandInput,
  CommandItem
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ConfirmationDialog } from '@/components/Shared/ui/Modal/confirmation-dialog'
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/Shared/ui/dropdown-menu"

// Expense types based on OHADA accounting system
export const expenseTypes = {
  RENT_UTILITIES: { code: "612/614", name: "Rent and Utilities", description: "Loyer et charges" },
  SALARIES: { code: "641/645", name: "Salaries and Social Contributions", description: "Salaires et charges sociales" },
  SUPPLIES: { code: "601/602", name: "Supplies and Inventory", description: "Fournitures et stocks" },
  INSURANCE: { code: "616", name: "Insurance", description: "Assurances" },
  ADVERTISING: { code: "623", name: "Advertising and Marketing", description: "Publicité et marketing" },
  MAINTENANCE: { code: "615", name: "Maintenance and Repairs", description: "Entretien et réparations" },
  TRANSPORT: { code: "624", name: "Transportation and Delivery Fees", description: "Frais de transport et livraison" },
  ADMIN: { code: "626", name: "Administrative Costs", description: "Frais administratifs" },
  TAXES: { code: "635", name: "Taxes and Duties", description: "Impôts et taxes" },
  BANK_FEES: { code: "627", name: "Bank Fees", description: "Frais bancaires" },
  LEGAL: { code: "622", name: "Legal and Accounting Fees", description: "Frais juridiques et comptables" }
}

// OHADA codes for custom categories
export const ohadaCodes = {
  "601": { code: "601", description: "Purchases of goods" },
  "602": { code: "602", description: "Purchases of raw materials and supplies" },
  "603": { code: "603", description: "Variations in stocks of purchased goods" },
  "604": { code: "604", description: "Purchases of consumable materials" },
  "605": { code: "605", description: "Purchases of packaging" },
  "608": { code: "608", description: "Purchases of studies and services" },
  "611": { code: "611", description: "General subcontracting" },
  "612": { code: "612", description: "Leasing and rental charges" },
  "613": { code: "613", description: "Maintenance, repairs and servicing" },
  "614": { code: "614", description: "Documentation charges" },
  "616": { code: "616", description: "Insurance premiums" },
  "618": { code: "618", description: "Miscellaneous expenses" },
  "622": { code: "622", description: "Fees" },
  "623": { code: "623", description: "Advertising, publications and public relations" },
  "624": { code: "624", description: "Transport of goods and personnel" },
  "625": { code: "625", description: "Travel, missions and receptions" },
  "626": { code: "626", description: "Postal and telecommunication charges" },
  "627": { code: "627", description: "Banking and similar services" },
  "628": { code: "628", description: "Miscellaneous external services" },
  "631": { code: "631", description: "Direct taxes and duties" },
  "632": { code: "632", description: "Indirect taxes and duties" },
  "633": { code: "633", description: "Other taxes" }
}

interface OhadaCodeResponse {
  success: boolean;
  codes?: OhadaCodeAttributes[];
  code?: OhadaCodeAttributes;
  message?: string;
}

interface ExpenseResponse {
  success: boolean;
  expenses?: ExpenseAttributes[];
  expense?: ExpenseAttributes;
  message?: string;
}

interface CreateExpenseRequest {
  data: Omit<ExpenseAttributes, 'id'>;
}

interface CreateOhadaCodeRequest {
  data: {
    code: string;
    name: string;
    description: string;
    type: 'expense';
    classification: 'Custom';
  };
}

// Add new interface for Supplier
interface Supplier {
  id: number;
  name: string;
  contact: string;
}

// Mock suppliers data
// const suppliers: Supplier[] = [...]

// Add this interface near the top with other interfaces
// interface Expense {...}

interface NewExpenseItem {
  date?: string;
  description?: string;
  amount?: string;
  paymentMethod?: string;
  ohadaCodeId?: string;
  isCustom?: boolean;
}

const Expenses = () => {
  const { user, business, availableShops } = useAuthLayout();
  const [expenses, setExpenses] = useState<ExpenseAttributes[]>([])
  const [ohadaCodes, setOhadaCodes] = useState<OhadaCodeAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState<NewExpenseItem>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    paymentMethod: 'cash',
    ohadaCodeId: '',
    isCustom: false
  });
  const [selectedOhadaCode, setSelectedOhadaCode] = useState<string>("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [filterValue, setFilterValue] = useState("all");
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseAttributes[]>([]);

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

        // Fetch OHADA codes for expense
        const codesResponse = await safeIpcInvoke<OhadaCodeResponse>(
          'finance:ohada-codes:get-by-type',
          { type: 'expense' },
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

        // Fetch expenses with associated OHADA codes
        const expensesResponse = await safeIpcInvoke<ExpenseResponse>(
          'finance:expense:get-all',
          {
            userId: user.id,
            userRole: user.role,
            shopId: requestShopId,
            shopIds: requestShopIds
          },
          { success: false }
        );

        if (expensesResponse?.success && expensesResponse.expenses) {
          setExpenses(expensesResponse.expenses);
        } else {
          setExpenses([]);
          toast({
            title: "Error",
            description: expensesResponse?.message || 'Failed to load expenses',
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setExpenses([]);
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

  useEffect(() => {
    let result = [...expenses];

    if (filterValue !== 'all') {
      result = result.filter(expense => expense.ohadaCodeId === filterValue);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(expense => 
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.ohadaCode?.name?.toLowerCase().includes(searchLower) ||
        formatCurrency(Number(expense.amount)).toLowerCase().includes(searchLower)
      );
    }

    setFilteredExpenses(result);
    setCurrentPage(1);
  }, [expenses, filterValue, searchTerm]);

  useEffect(() => {
    // Auto-select first available shop for non-admin users
    if (user?.role !== 'admin' && user?.role !== 'shop_owner') {
      const defaultShopId = availableShops?.[0]?.id;
      if (defaultShopId) {
        setSelectedShopId(defaultShopId);
      }
    }
  }, [user?.role, availableShops]);

  const itemsPerPage = 10
  const totalFilteredItems = filteredExpenses.length;
  const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const currentItems = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  const handleCheckboxChange = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

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

  const handleAddItem = async () => {
    try {
      let ohadaCodeId = newItem.ohadaCodeId;

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
            type: 'expense',
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

      const createExpenseRequest = {
        data: {
          date: new Date(newItem.date),
          description: newItem.description,
          amount: parseFloat(newItem.amount),
          paymentMethod: newItem.paymentMethod,
          ohadaCodeId: ohadaCodeId,
          userId: user?.id,
          shopId: selectedShopId || undefined,
          status: 'completed'
        }
      };

      const response = await safeIpcInvoke<ExpenseResponse>(
        'finance:expense:create',
        createExpenseRequest,
        { success: false }
      );

      if (response?.success && response.expense) {
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

        // Update expenses list with the new expense at the beginning
        const newExpense = response.expense as unknown as ExpenseAttributes;
        setExpenses(prevExpenses => [newExpense, ...prevExpenses]);
        setFilteredExpenses(prevFiltered => [newExpense, ...prevFiltered]);

        toast({
          title: "Success",
          description: "Expense added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to create expense',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: 'Failed to add expense',
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async () => {
    try {
      if (!expenseToDelete) return;

      const response = await safeIpcInvoke<ExpenseResponse>(
        'finance:expense:delete',
        { id: expenseToDelete.id }
      );

      if (response?.success) {
        setExpenses(prevExpenses => 
          prevExpenses.filter(exp => exp.id !== expenseToDelete.id)
        );
        toast({
          title: "Success",
          description: "Expense deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to delete expense',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: 'Failed to delete expense',
        variant: "destructive",
      });
    } finally {
      setExpenseToDelete(null);
    }
  };

  const handleEditClick = (expense: any) => {
    const dataValues = expense.dataValues || expense;
    setEditingExpense({
      ...dataValues,
      date: new Date(dataValues.date).toISOString().split('T')[0], // Format date for input
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateExpense = async () => {
    try {
      if (!editingExpense.id) return;

      const updateExpenseRequest = {
        id: editingExpense.id,
        data: {
          date: new Date(editingExpense.date),
          description: editingExpense.description,
          amount: parseFloat(editingExpense.amount),
          paymentMethod: editingExpense.paymentMethod,
          ohadaCodeId: editingExpense.ohadaCodeId,
          shopId: editingExpense.shopId
        }
      };

      const response = await safeIpcInvoke<ExpenseResponse>(
        'finance:expense:update',
        updateExpenseRequest,
        { success: false }
      );

      console.log('Update Expense Response:', JSON.stringify(response, null, 2));

      if (response?.success && response.expense) {
        // Format the updated expense data
        const formattedExpense = {
          ...response.expense,
          date: new Date(response.expense.date),
          ohadaCode: response.expense.ohadaCode
        };
        
        // Update expenses state with the formatted expense
        setExpenses(prevExpenses =>
          prevExpenses.map(exp => 
            exp.id === editingExpense.id ? formattedExpense : exp
          )
        );
        
        // Reset edit state
        setIsEditDialogOpen(false);
        setEditingExpense(null);
        
        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to update expense',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: 'Failed to update expense',
        variant: "destructive",
      });
    }
  };

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

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // Check if expenses data exists
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
      const data = currentItems.map((item: ExpenseAttributes) => ([
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
        a.download = `${shopName}_Expenses_${dateString}.${fileExtension}`;
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
          doc.text(`${shopName} - Expenses Report`, 14, 20);
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
          doc.save(`${shopName}_Expenses_${dateString}.pdf`);
          
          toast({
            title: "Export Successful",
            description: "PDF report generated with expense details",
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
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
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
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
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
                  <Label>Category</Label>
                  {!isCustomCategory ? (
                    <Select
                      value={selectedOhadaCode}
                      onValueChange={handleOhadaCodeSelection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category Code" />
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
                <Button onClick={handleAddItem}>Add Expense</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : expenses.length === 0 ? (
        <EmptyState onAddClick={() => setIsAddDialogOpen(true)} />
      ) : (
        <div className="space-y-4">
          {/* Search and Filter Section */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-[180px]">
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4" />
                    <SelectValue placeholder="Filter Expenses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expenses</SelectItem>
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
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((item: ExpenseAttributes) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{formatCurrency(Number(item.amount))}</TableCell>
                        <TableCell style={{ textTransform: 'capitalize' }}>
                          {item.paymentMethod?.replace('_', ' ')}
                        </TableCell>
                        <TableCell>{item.ohadaCode?.name || 'Unknown'}</TableCell>
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
                              onClick={() => setExpenseToDelete(item)}
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
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {currentPage * itemsPerPage - itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalFilteredItems)} of {totalFilteredItems} entries
              </span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setCurrentPage(Math.ceil(totalFilteredItems / Number(value)));
              }}>
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
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editingExpense?.date}
                onChange={(e) =>
                  setEditingExpense({ ...editingExpense, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editingExpense?.description}
                onChange={(e) =>
                  setEditingExpense({ ...editingExpense, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={editingExpense?.amount}
                onChange={(e) =>
                  setEditingExpense({ ...editingExpense, amount: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={editingExpense?.paymentMethod}
                onValueChange={(value) =>
                  setEditingExpense({ ...editingExpense, paymentMethod: value })
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
            <div>
              <Label>Category</Label>
              <Select
                value={editingExpense?.ohadaCodeId}
                onValueChange={(value) =>
                  setEditingExpense({ ...editingExpense, ohadaCodeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {ohadaCodes.map((code: any) => (
                    <SelectItem key={code.dataValues.id} value={code.dataValues.id}>
                      {code.dataValues.code} - {code.dataValues.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateExpense}>Update Expense</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        description={`Are you sure you want to delete this expense? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}

export default Expenses