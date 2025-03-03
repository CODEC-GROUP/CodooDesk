"use client"

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from '@/hooks/use-toast'
import { safeIpcInvoke } from "@/lib/ipc"
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { InventoryAttributes } from "@/models/Inventory"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"

interface AddWarehouseProps {
  onBack: () => void;
}

const AddWarehouse: React.FC<AddWarehouseProps> = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Medium" as "Low" | "Medium" | "High",
    level: 0,
    value: 0
  })
  const { business, currentShopId } = useAuthLayout()

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddWarehouse = async () => {
    try {
      setIsLoading(true)
      
      if (!formData.name.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Warehouse name is required'
        });
        return;
      }

      const response = await safeIpcInvoke<{ 
        success: boolean; 
        data: InventoryAttributes;
        message?: string 
      }>('inventory:create', {
        name: formData.name.trim(),
        description: formData.description.trim(),
        shopId: currentShopId || business?.shops?.[0]?.id || null,
        level: formData.level,
        value: formData.value,
        status: formData.status
      });

      if (response?.success) {
        toast({ 
          title: 'Success', 
          description: 'Warehouse created successfully'
        });
        onBack();
      } else {
        throw new Error(response?.message || 'Failed to create warehouse');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create warehouse'
      });
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Button 
        onClick={onBack} 
        variant="outline" 
        className="mb-4"
        disabled={isLoading}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Warehouse</CardTitle>
          <CardDescription>Create a new warehouse to track your inventory</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="warehouse-name">Warehouse Name</Label>
            <Input
              id="warehouse-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter warehouse name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Input
              id="status"
              value="Medium"
              disabled={true}
              className="bg-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                type="number"
                min="0"
                value={0}
                disabled={true}
                className="bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                min="0"
                value={0}
                disabled={true}
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter warehouse description"
              disabled={isLoading}
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleAddWarehouse} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Warehouse...' : 'Create Warehouse'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddWarehouse
