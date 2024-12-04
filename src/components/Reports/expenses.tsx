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

const Expenses = () => {
  const [expenses, setExpenses] = useState<ExpenseAttributes[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState<{
    expenseType?: keyof typeof expenseTypes;
    [key: string]: any;
  }>({})
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState({ 
    name: "", 
    code: "", 
    description: "" 
  });
  const [searchSupplier, setSearchSupplier] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [accounts, setAccounts] = useState([
    { id: "1", type: "UBA", number: "1234567890" },
    { id: "2", type: "MOMO", number: "0987654321" },
    { id: "3", type: "Orange Money", number: "1122334455" },
  ])
  const [ohadaCodes, setOhadaCodes] = useState<OhadaCodeAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch OHADA codes for expenses
        const codesResponse = await safeIpcInvoke<OhadaCodeResponse>('finance:ohada-codes:get-by-type', { 
          type: 'expense' 
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

        // Fetch expenses
        const expensesResponse = await safeIpcInvoke<ExpenseResponse>('finance:expense:get-all', {}, {
          success: false,
          expenses: []
        });

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

  const itemsPerPage = 10
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage

  const filteredItems = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem)

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  const handleCheckboxChange = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleAddItem = async () => {
    try {
      let ohadaCodeId = newItem.ohadaCodeId;

      // If it's a custom category, create new OHADA code first
      if (isCustomCategory) {
        const ohadaRequest: CreateOhadaCodeRequest = {
          data: {
            code: customCategory.code,
            name: customCategory.name,
            description: customCategory.description,
            type: 'expense',
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

      const expenseData: Omit<ExpenseAttributes, 'id'> = {
        date: new Date(newItem.date || Date.now()),
        description: newItem.description || '',
        amount: parseFloat(newItem.amountPaid || '0'),
        paymentMethod: newItem.paymentMethod || '',
        ohadaCodeId,
        status: 'pending'
      };
      
      await handleAddExpense(expenseData);
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: 'Failed to add expense',
        variant: "destructive",
      });
    }
  };

  const handleAddExpense = async (expenseData: Omit<ExpenseAttributes, 'id'>) => {
    try {
      const request: CreateExpenseRequest = { data: expenseData };
      const response = await safeIpcInvoke<ExpenseResponse>('finance:expense:create', 
        request, 
        { success: false }
      );
      
      if (response?.success && response.expense) {
        setExpenses([...expenses, response.expense]);
        setIsAddDialogOpen(false);
        setNewItem({});
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
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: 'Failed to create expense',
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const response = await safeIpcInvoke<{ success: boolean; message?: string }>('finance:expense:delete', {
        expenseId
      }, { success: false });

      if (response?.success) {
        setExpenses(expenses.filter(exp => exp.id !== expenseId));
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
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Expenses</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
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
                <SelectItem value="all">All Expenses</SelectItem>
                {Object.entries(expenseTypes).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.name}</SelectItem>
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
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
                    <TableCell>{item.paymentMethod}</TableCell>
                    <TableCell>{ohadaCodes.find(code => code.id === item.ohadaCodeId)?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
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
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Input
                id="date"
                type="date"
                className="col-span-3"
                value={newItem.date || new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input
                id="description"
                className="col-span-3"
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input
                id="amount"
                type="number"
                className="col-span-3"
                onChange={(e) => setNewItem({ ...newItem, amountPaid: `${e.target.value} XAF` })}
              />
            </div>

            {isCustomCategory ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customName" className="text-right">Category Name</Label>
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
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddItem}>Add Expense</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Expenses