"use client"

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Calendar } from "@/components/Shared/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Shared/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Search, Upload, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

// Define the Product type
interface Product {
  id: number; // or string, depending on your ID type
  name: string;
  sku: string;
  category: string;
  image?: string; // Optional property for the product image
}

// Mock data for products and suppliers
const products: Product[] = [
  { id: 1, name: "Laptop", sku: "LAP001", category: "Electronics" },
  { id: 2, name: "Smartphone", sku: "PHN001", category: "Electronics" },
  { id: 3, name: "T-Shirt", sku: "TSH001", category: "Clothing" },
]

const suppliers = [
  { id: 1, name: "TechSupplier Inc." },
  { id: 2, name: "ClothingWholesale Ltd." },
  { id: 3, name: "GeneralGoods Co." },
]

const spendingAccounts = [
  { id: 1, name: "Main Account" },
  { id: 2, name: "Secondary Account" },
  { id: 3, name: "Savings Account" },
]

const expenseTypes = [
  { id: 1, name: "Operational" },
  { id: 2, name: "Marketing" },
  { id: 3, name: "Miscellaneous" },
]

interface AddInventoryProps {
  onBack: () => void;
}

const AddInventory: React.FC<AddInventoryProps> = ({ onBack }) => {
  const router = useRouter()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [purchaseDate, setPurchaseDate] = useState<Date>()
  const [quantity, setQuantity] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [stockDescription, setStockDescription] = useState("")
  const [unitType, setUnitType] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("")
  const [sellingPrice, setSellingPrice] = useState("")
  const [selectedSpendingAccount, setSelectedSpendingAccount] = useState(null)
  const [selectedExpenseType, setSelectedExpenseType] = useState(null)

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  )

  const handleAddInventory = () => {
    // Here you would typically send the data to your backend
    console.log({
      product: selectedProduct,
      supplier: selectedSupplier,
      purchaseDate,
      quantity,
      batchNumber,
      stockDescription,
      unitType,
      sellingPrice,
      spendingAccount: selectedSpendingAccount,
      expenseType: selectedExpenseType,
    })
    // Reset form or show success message
  }

  const handleBack = () => {
    onBack()
  }

  return (
    <div className="container mx-auto py-10">
      <Button onClick={handleBack} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <h1 className="text-3xl font-bold mb-6">Add Inventory</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Inventory Entry</CardTitle>
          <CardDescription>Add new inventory for products from multiple suppliers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="product-search">Product Search</Label>
            <div className="flex space-x-2">
              <Input
                id="product-search"
                placeholder="Search by name, SKU, or category"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            {searchTerm && (
              <Select onValueChange={(value) => setSelectedProduct(JSON.parse(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={JSON.stringify(product)}>
                      {product.name} - {product.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-search">Supplier Search</Label>
            <div className="flex space-x-2">
              <Input
                id="supplier-search"
                placeholder="Search for supplier"
                value={supplierSearchTerm}
                onChange={(e) => setSupplierSearchTerm(e.target.value)}
              />
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {supplierSearchTerm && (
              <Select onValueChange={(value) => setSelectedSupplier(JSON.parse(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={JSON.stringify(supplier)}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedProduct && !selectedProduct?.image && (
            <div className="space-y-2">
              <Label htmlFor="product-image">Product Image</Label>
              <div className="flex items-center space-x-2">
                <Input id="product-image" type="file" accept="image/*" />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="purchase-date">Purchase Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !purchaseDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {purchaseDate ? format(purchaseDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={setPurchaseDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-number">Batch Number (Optional)</Label>
            <Input
              id="batch-number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock-description">Stock Description (Optional)</Label>
            <Textarea
              id="stock-description"
              value={stockDescription}
              onChange={(e) => setStockDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-type">Unit Type</Label>
            <Select onValueChange={setUnitType}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="kg">Kilogram</SelectItem>
                <SelectItem value="liter">Liter</SelectItem>
                <SelectItem value="meter">Meter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="selling-price">Selling Price</Label>
            <Input
              id="selling-price"
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="Enter selling price"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spending-account">Spending Account</Label>
            <Select onValueChange={(value) => setSelectedSpendingAccount(JSON.parse(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a spending account" />
              </SelectTrigger>
              <SelectContent>
                {spendingAccounts.map((account) => (
                  <SelectItem key={account.id} value={JSON.stringify(account)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-type">Expense Type</Label>
            <Select onValueChange={(value) => setSelectedExpenseType(JSON.parse(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select an expense type" />
              </SelectTrigger>
              <SelectContent>
                {expenseTypes.map((type) => (
                  <SelectItem key={type.id} value={JSON.stringify(type)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddInventory} className="w-full">Add Inventory</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default AddInventory
