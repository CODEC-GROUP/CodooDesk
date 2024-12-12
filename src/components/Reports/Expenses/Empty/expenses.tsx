"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/Shared/ui/dialog"
import { Label } from "@/components/Shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { ArrowLeft, ArrowRight, Search, Plus, Edit, Trash2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Shared/ui/card"
import { FileDown } from "lucide-react"
import { OhadaCodeAttributes } from '@/models/OhadaCode';
import { ExpenseAttributes } from '@/models/Expense';
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import EmptyState from './EmptyState';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';

import { ConfirmationDialog } from '@/components/Shared/ui/Modal/confirmation-dialog'

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
  const { user, business } = useAuthLayout();
  const [expenses, setExpenses] = useState<ExpenseAttributes[]>([])
  const [ohadaCodes, setOhadaCodes] = useState<OhadaCodeAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState<NewExpenseItem>({})
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
          {},
          { success: false }
        );

        if (expensesResponse?.success && expensesResponse.expenses) {
          setExpenses(expensesResponse.expenses);
        } else {
          toast({
            title: "Error",
            description: expensesResponse?.message || 'Failed to load expenses',
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

        // Use the newly created OHADA code's ID
        ohadaCodeId = response.code.id;
      }

      // Proceed with creating the expense
      if (!ohadaCodeId || !newItem.date || !newItem.description || !newItem.amount || !newItem.paymentMethod) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const createExpenseRequest: CreateExpenseRequest = {
        data: {
          date: new Date(newItem.date || Date.now()),
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
        // Format the new expense data before adding to state
        const formattedExpense = {
          ...response.expense,
          date: new Date(response.expense.date), // Ensure date is properly formatted
        };
        setExpenses(prevExpenses => [...prevExpenses, formattedExpense]);
        setIsAddDialogOpen(false);
        setNewItem({});
        setSelectedOhadaCode("");
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

      if (response?.success) {
        setExpenses(prevExpenses =>
          prevExpenses.map(exp => 
            exp.id === editingExpense.id ? { ...exp, ...editingExpense } : exp
          )
        );
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

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
        <div className="flex items-center space-x-2">
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
          <div className="flex items-center py-4">
            <Select
              value={filterValue}
              onValueChange={setFilterValue}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expenses</SelectItem>
                {ohadaCodes.map((code: any) => (
                  <SelectItem 
                    key={code.dataValues.id} 
                    value={code.dataValues.id}
                  >
                    {code.dataValues.name}
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
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditClick(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
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