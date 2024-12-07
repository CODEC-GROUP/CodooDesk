'use client'

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Shared/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import Pagination from "@/components/Shared/ui/pagination"
import { Search, FileDown, Plus, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Shared/ui/dialog"

type PurchaseHistory = {
  id: number
  supplierName: string
  productName: string
  purchaseDate: string
  quantityPurchased: number
  purchasePrice: number
  totalCost: number
}

const purchaseHistoryData: PurchaseHistory[] = [
  { id: 1, supplierName: "Supplier A", productName: "Product X", purchaseDate: "2023-06-01", quantityPurchased: 100, purchasePrice: 10, totalCost: 1000 },
  { id: 2, supplierName: "Supplier B", productName: "Product Y", purchaseDate: "2023-06-02", quantityPurchased: 200, purchasePrice: 15, totalCost: 3000 },
  { id: 3, supplierName: "Supplier C", productName: "Product Z", purchaseDate: "2023-06-03", quantityPurchased: 150, purchasePrice: 20, totalCost: 3000 },
  { id: 4, supplierName: "Supplier A", productName: "Product W", purchaseDate: "2023-06-04", quantityPurchased: 300, purchasePrice: 5, totalCost: 1500 },
  { id: 5, supplierName: "Supplier D", productName: "Product V", purchaseDate: "2023-06-05", quantityPurchased: 250, purchasePrice: 12, totalCost: 3000 },
]

export function PurchaseHistoryTable() {
  const [purchases] = useState<PurchaseHistory[]>(purchaseHistoryData)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPurchases, setSelectedPurchases] = useState<number[]>([])
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseHistory | null>(null)
  const itemsPerPage = 10

  const filteredPurchases = purchases.filter(purchase =>
    Object.values(purchase).some(value => 
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const pageCount = Math.ceil(filteredPurchases.length / itemsPerPage)
  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const togglePurchaseSelection = (purchaseId: number) => {
    setSelectedPurchases(prevSelected =>
      prevSelected.includes(purchaseId)
        ? prevSelected.filter(id => id !== purchaseId)
        : [...prevSelected, purchaseId]
    )
  }

  const toggleAllPurchases = () => {
    setSelectedPurchases(
      selectedPurchases.length === paginatedPurchases.length
        ? []
        : paginatedPurchases.map(p => p.id)
    )
  }

  const openOverlay = (purchase: PurchaseHistory) => {
    setSelectedPurchase(purchase);
  }

  const closeOverlay = () => {
    setSelectedPurchase(null);
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="mb-6">
        <CardHeader className="flex flex-col items-start space-y-2 pb-2">
          <CardTitle className="text-2xl font-bold">Supplier-Product Purchase History Table</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => { /* Add purchase logic */ }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Purchase
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
                <SelectItem value="all">All Purchases</SelectItem>
                <SelectItem value="supplier">By Supplier</SelectItem>
                <SelectItem value="product">By Product</SelectItem>
                <SelectItem value="date">By Date</SelectItem>
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

          {/* Desktop View - Traditional Table */}
          <div className="hidden md:block">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedPurchases.length === paginatedPurchases.length}
                        onCheckedChange={toggleAllPurchases}
                      />
                    </TableHead>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Quantity Purchased</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPurchases.includes(purchase.id)}
                          onCheckedChange={() => togglePurchaseSelection(purchase.id)}
                        />
                      </TableCell>
                      <TableCell>{purchase.supplierName}</TableCell>
                      <TableCell>{purchase.productName}</TableCell>
                      <TableCell>{purchase.purchaseDate}</TableCell>
                      <TableCell>{purchase.quantityPurchased}</TableCell>
                      <TableCell>{purchase.purchasePrice} FCFA</TableCell>
                      <TableCell>{purchase.totalCost} FCFA</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openOverlay(purchase)}>
                          <Pencil className="h-4 w-4" />
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
          </div>

          {/* Mobile View - Cards */}
          <div className="md:hidden">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="mb-4 cursor-pointer w-full" onClick={() => openOverlay(purchase)}>
                <CardContent className="flex flex-col p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Supplier: {purchase.supplierName}</span>
                    <span className="text-sm text-gray-500">Date: {purchase.purchaseDate}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-sm text-gray-500">Quantity: {purchase.quantityPurchased}</p>
                    <p className="text-sm text-gray-500">Total Cost: {purchase.totalCost} XAF</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-4">
            <Pagination 
              currentPage={currentPage} 
              totalPages={pageCount} 
              onPageChange={setCurrentPage} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Overlay for additional purchase details */}
      {selectedPurchase && (
        <Dialog open={!!selectedPurchase} onOpenChange={closeOverlay}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase Details</DialogTitle>
            </DialogHeader>
            <p><strong>Supplier:</strong> {selectedPurchase.supplierName}</p>
            <p><strong>Product:</strong> {selectedPurchase.productName}</p>
            <p><strong>Purchase Date:</strong> {selectedPurchase.purchaseDate}</p>
            <p><strong>Quantity Purchased:</strong> {selectedPurchase.quantityPurchased}</p>
            <p><strong>Purchase Price:</strong> {selectedPurchase.purchasePrice} XAF</p>
            <p><strong>Total Cost:</strong> {selectedPurchase.totalCost} XAF</p>
            <Button onClick={closeOverlay}>Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
