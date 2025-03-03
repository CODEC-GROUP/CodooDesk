"use client"

import { useState, useEffect, useReducer } from "react"
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
import { safeIpcInvoke } from "@/lib/ipc"
import { toast } from "@/hooks/use-toast"
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"

// Define the Product type
interface Product {
  id: string; // Changed from number to string
  name: string;
  sku: string;
  category: string;
  image?: string; // Optional property for the product image
  supplierId: string;
  unitType?: string;
  sellingPrice: number;
  purchasePrice: number;
  suppliers: { id: number; name: string }[];
  featuredImage?: string;
  quantity?: number;
}

// Add these interfaces
interface Supplier {
  id: number;
  name: string;
}

interface SpendingAccount {
  id: number;
  name: string;
}

interface OhadaCodeAttributes {
  dataValues: {
    id: string;
    code: string;
    name: string;
    description: string;
  };
}

interface AddInventoryProps {
  onBack: () => void;
  warehouseId: string;
  onSuccess: () => void;
  parentView?: 'inventory' | 'warehouse';
}

const AddInventory: React.FC<AddInventoryProps> = ({ onBack, warehouseId, onSuccess, parentView = 'inventory' }) => {
  const { user } = useAuthLayout();
  const router = useRouter()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<Date>()
  const [quantity, setQuantity] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [stockDescription, setStockDescription] = useState("")
  const [unitType, setUnitType] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("")
  const [sellingPrice, setSellingPrice] = useState("")
  const [selectedExpenseType, setSelectedExpenseType] = useState<string>("601")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [ohadaCodes, setOhadaCodes] = useState<OhadaCodeAttributes[]>([])
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const filteredSuppliers = selectedProduct?.suppliers?.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  ) || [];

  useEffect(() => {
    const searchProducts = async () => {
      if (searchTerm) {
        try {
          const result = await safeIpcInvoke(
            'inventory:product:search',
            { query: searchTerm },
            { products: [] }
          );
          
          console.log('Product search response:', result);
          
          setFilteredProducts(result?.products || []);
        } catch (error) {
          console.error('Product search failed:', error);
          setFilteredProducts([]);
        }
      }
    };
    searchProducts();
  }, [searchTerm]);

  useEffect(() => {
    const fetchOhadaCodes = async () => {
      try {
        const result = await safeIpcInvoke<{ success: boolean; codes: OhadaCodeAttributes[] }>(
          'finance:ohada-codes:get-by-type',
          { type: 'expense' },
          { success: false, codes: [] }
        );
        
        if (result?.success) {
          setOhadaCodes(result.codes);
          // Set default to "Purchase of goods" (code 601)
          const defaultCode = result.codes.find((code: OhadaCodeAttributes) => code.dataValues.code === "601");
          if (defaultCode) setSelectedExpenseType(defaultCode.dataValues.id);
        }
      } catch (error) {
        console.error('Failed to fetch OHADA codes:', error);
      }
    };
    fetchOhadaCodes();
  }, []);

  useEffect(() => {
    if (selectedProduct?.suppliers && selectedProduct.suppliers.length > 0) {
      setSelectedSupplier(selectedProduct.suppliers[0]);
    }
  }, [selectedProduct]);

  useEffect(() => {
    console.log('Current quantity state:', quantity);
  }, [quantity]);

  const handleAddInventory = async () => {
    // Validate required fields
    if (!selectedProduct) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a product' });
      return;
    }

    if (!quantity || parseInt(quantity, 10) <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid quantity' });
      return;
    }

    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid selling price' });
      return;
    }

    if (!unitType) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a unit type' });
      return;
    }

    const itemData = {
      product_id: selectedProduct.id,
      inventory_id: warehouseId,
      quantity: parseInt(quantity, 10),
      unit_cost: selectedProduct.purchasePrice,
      selling_price: parseFloat(sellingPrice),
      batch_number: batchNumber,
      unit_type: unitType,
      stock_type: 'purchase',
      supplier_id: selectedSupplier?.id,
      userId: user?.id, // Add user ID from AuthLayout context
    };

    console.log('Sending inventory item data:', itemData);
    console.log('Selected product:', selectedProduct);

    try {
      const result = await safeIpcInvoke<{ success: boolean; message?: string; error?: string }>(
        'inventory:item:create',
        { itemData },
        { success: false }
      );

      if (result?.success) {
        toast({ 
          title: 'Success', 
          description: `Successfully added ${quantity} ${unitType}(s) of ${selectedProduct.name} to inventory`,
          variant: 'default'
        });
        onBack();
        onSuccess();
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Error', 
          description: result?.message || 'Failed to add inventory. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Failed to add inventory:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to add inventory. Please try again.' 
      });
    }
  };

  const handleBack = () => {
    if (parentView === 'inventory') {
      onBack();
    } else {
      // If coming from warehouse list, navigate back to inventory list
      onBack();
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={handleBack} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Add Inventory Item</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New Inventory Entry</CardTitle>
          <CardDescription>Add new inventory for products from multiple suppliers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="product-search">Product Search</Label>
            <div className="relative">
              <Input
                id="product-search"
                placeholder="Search by name, SKU, or category"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                  {filteredProducts.length === 0 && searchTerm ? (
                    <div className="p-2 text-muted-foreground">No products found</div>
                  ) : (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedProduct(product);
                          
                          // Convert "digital" unit type to "piece"
                          const resolvedUnitType = product.unitType === 'digital' ? 'piece' : product.unitType || 'piece';
                          setUnitType(resolvedUnitType);
                          
                          // Convert numeric price to string without formatting
                          setSellingPrice(product.sellingPrice?.toString() || '');
                          
                          // Convert quantity to string explicitly
                          const qty = product.quantity?.toString() || '';
                          console.log('Setting quantity:', qty);
                          setQuantity(qty);
                          
                          // Clear supplier if none available
                          setSelectedSupplier(null);
                        }}
                      >
                        {product.name} - {product.sku}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-search">Supplier (Optional)</Label>
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

          {selectedProduct && (
            <div className="space-y-2">
              <Label>Product Image</Label>
              {selectedProduct.featuredImage ? (
                <img 
                  src={`file:///${selectedProduct.featuredImage.replace(/\\/g, '/')}`}
                  alt={selectedProduct.name}
                  className="h-32 w-32 object-cover rounded-md"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Input id="product-image" type="file" accept="image/*" />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
              placeholder="Enter quantity"
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
            <Select 
              value={unitType}
              onValueChange={setUnitType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="kg">Kilogram (kg)</SelectItem>
                <SelectItem value="liter">Liter (l)</SelectItem>
                <SelectItem value="meter">Meter (m)</SelectItem>
                <SelectItem value="digital">Digital Unit</SelectItem>
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
            <Label htmlFor="expense-type">Expense Type</Label>
            <Select 
              value={selectedExpenseType}
              onValueChange={(value) => setSelectedExpenseType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expense type">
                  {ohadaCodes.find(c => c.dataValues.id === selectedExpenseType)?.dataValues.name || "Select type"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ohadaCodes.map((code: any) => (
                  <SelectItem key={code.dataValues.id} value={code.dataValues.id}>
                    {code.dataValues.code} - {code.dataValues.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <div className="text-sm text-muted-foreground">
              Loaded: {selectedProduct.name} (Price: {selectedProduct.sellingPrice}, Unit: {selectedProduct.unitType})
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddInventory} className="w-full">Add Inventory</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default AddInventory
