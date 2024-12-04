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
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"

type StockMovement = {
  id: number
  type: 'Added' | 'Sold' | 'Returned' | 'Adjustment'
  quantity: number
  date: string
  movementType: 'Inbound' | 'Outbound'
  reason: string
  destination?: string
  performedBy?: string
}

const stockMovementsData: StockMovement[] = [
  { id: 1, type: "Added", quantity: 100, date: "2023-06-01", movementType: "Inbound", reason: "Restocking", destination: "Warehouse A", performedBy: "John Doe" },
  { id: 2, type: "Sold", quantity: 50, date: "2023-06-02", movementType: "Outbound", reason: "Customer Purchase", destination: "Main Store", performedBy: "Jane Smith" },
  { id: 3, type: "Returned", quantity: 10, date: "2023-06-03", movementType: "Inbound", reason: "Defective Product", destination: "Warehouse B", performedBy: "John Doe" },
  { id: 4, type: "Adjustment", quantity: -5, date: "2023-06-04", movementType: "Outbound", reason: "Inventory Count", destination: "Main Store", performedBy: "Jane Smith" },
  { id: 5, type: "Added", quantity: 200, date: "2023-06-05", movementType: "Inbound", reason: "New Stock", destination: "Warehouse A", performedBy: "John Doe" },
]

export function StockMovementTable() {
  const [movements, setMovements] = useState<StockMovement[]>(stockMovementsData)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMovements, setSelectedMovements] = useState<number[]>([])
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [movementType, setMovementType] = useState<"Inbound" | "Outbound">("Inbound")
  const itemsPerPage = 10

  const filteredMovements = movements.filter(movement =>
    Object.values(movement).some(value => 
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const pageCount = Math.ceil(filteredMovements.length / itemsPerPage)
  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const toggleMovementSelection = (movementId: number) => {
    setSelectedMovements(prevSelected =>
      prevSelected.includes(movementId)
        ? prevSelected.filter(id => id !== movementId)
        : [...prevSelected, movementId]
    )
  }

  const toggleAllMovements = () => {
    setSelectedMovements(
      selectedMovements.length === paginatedMovements.length
        ? []
        : paginatedMovements.map(m => m.id)
    )
  }

  const openOverlay = (movement: StockMovement) => {
    setSelectedMovement(movement);
  }

  const closeOverlay = () => {
    setSelectedMovement(null);
  }

  const handleAddMovement = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const newMovement: StockMovement = {
      id: movements.length + 1,
      type: formData.get('type') as StockMovement['type'],
      quantity: Number(formData.get('quantity')),
      date: formData.get('date') as string,
      movementType: formData.get('movementType') as StockMovement['movementType'],
      reason: formData.get('reason') as string,
      destination: movementType === 'Outbound' ? formData.get('destination') as string : undefined,
      performedBy: formData.get('performedBy') as string,
    }
    setMovements([...movements, newMovement])
    setShowAddForm(false)
  }

  const handleMovementTypeChange = (value: "Inbound" | "Outbound") => {
    setMovementType(value);
  };

  if (showAddForm) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Add Stock Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMovement} className="space-y-4">
              <div>
                <Label htmlFor="type">Movement Type</Label>
                <Select name="type">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Added">Added</SelectItem>
                    <SelectItem value="Sold">Sold</SelectItem>
                    <SelectItem value="Returned">Returned</SelectItem>
                    <SelectItem value="Adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input type="number" name="quantity" required />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input type="date" name="date" required />
              </div>
              <div>
                <Label htmlFor="movementType">Inbound/Outbound</Label>
                <Select 
                  name="movementType" 
                  onValueChange={(value: string) => handleMovementTypeChange(value as "Inbound" | "Outbound")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select movement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inbound">Inbound</SelectItem>
                    <SelectItem value="Outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {movementType === 'Outbound' && (
                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Select name="destination">
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Warehouse A">Warehouse A</SelectItem>
                      <SelectItem value="Warehouse B">Warehouse B</SelectItem>
                      <SelectItem value="Main Store">Main Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea name="reason" required />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit">Add Movement</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Stock Movement Tracking</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Movement
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
                <SelectItem value="all">All Movements</SelectItem>
                <SelectItem value="added">Added</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
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
                      checked={selectedMovements.length === paginatedMovements.length}
                      onCheckedChange={toggleAllMovements}
                    />
                  </TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Inbound/Outbound</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMovements.includes(movement.id)}
                        onCheckedChange={() => toggleMovementSelection(movement.id)}
                      />
                    </TableCell>
                    <TableCell>{movement.type}</TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>{movement.date}</TableCell>
                    <TableCell>{movement.movementType}</TableCell>
                    <TableCell>{movement.reason}</TableCell>
                    <TableCell>{movement.performedBy}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openOverlay(movement)}>
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
          <div className="mt-4">
            <Pagination 
              currentPage={currentPage} 
              totalPages={pageCount} 
              onPageChange={setCurrentPage} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile View */}
      <div className="md:hidden">
        {movements.map((movement) => (
          <Card key={movement.id} className="mb-4 cursor-pointer w-full" onClick={() => openOverlay(movement)}>
            <CardContent className="flex flex-col p-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Type: {movement.type}</span>
                <span className="text-sm text-gray-500">Date: {movement.date}</span>
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-sm text-gray-500">Quantity: {movement.quantity}</p>
                <p className="text-sm text-gray-500">Movement: {movement.movementType}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overlay for additional movement details */}
      {selectedMovement && (
        <Dialog open={!!selectedMovement} onOpenChange={closeOverlay}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Movement Details</DialogTitle>
            </DialogHeader>
            <p><strong>Type:</strong> {selectedMovement.type}</p>
            <p><strong>Quantity:</strong> {selectedMovement.quantity}</p>
            <p><strong>Date:</strong> {selectedMovement.date}</p>
            <p><strong>Inbound/Outbound:</strong> {selectedMovement.movementType}</p>
            <p><strong>Reason:</strong> {selectedMovement.reason}</p>
            <p><strong>Performed By:</strong> {selectedMovement.performedBy}</p>
            <Button onClick={closeOverlay}>Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
