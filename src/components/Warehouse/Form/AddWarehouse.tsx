"use client"

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface AddWarehouseProps {
  onBack: () => void;
}

const AddWarehouse: React.FC<AddWarehouseProps> = ({ onBack }) => {
  const router = useRouter()
  const [warehouseName, setWarehouseName] = useState("")
  const [description, setDescription] = useState("")

  const handleAddWarehouse = () => {
    // Here you would typically send the data to your backend
    console.log({
      name: warehouseName,
      description,
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
          <CardTitle>New Warehouse Entry</CardTitle>
          <CardDescription>Add a new inventory to your system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="warehouse-name">Inventory Name</Label>
            <Input
              id="warehouse-name"
              value={warehouseName}
              onChange={(e) => setWarehouseName(e.target.value)}
              placeholder="Enter inventory name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddWarehouse} className="w-full">Add Inventory</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default AddWarehouse
