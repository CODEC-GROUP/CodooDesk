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
import { useAppTranslation } from '@/hooks/useAppTranslation'

interface AddWarehouseProps {
  onBack: () => void;
}

const AddWarehouse: React.FC<AddWarehouseProps> = ({ onBack }) => {
  const { t } = useAppTranslation()
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
          title: t('error'),
          description: t('warehouse.name_required')
        });
        return;
      }

      const response = await safeIpcInvoke<{ success: boolean; data: InventoryAttributes }>(
        'inventory:create',
        {
          name: formData.name.trim(),
          description: formData.description.trim(),
          shopId: currentShopId || business?.shops?.[0]?.id || null,
          level: formData.level,
          value: formData.value,
          status: formData.status
        }
      );

      if (response?.success) {
        toast({ 
          title: t('success'), 
          description: t('warehouse.created_successfully')
        });
        onBack();
      } else {
        throw new Error(response?.message || t('warehouse.create_failed'));
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: err instanceof Error ? err.message : t('warehouse.create_failed')
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
        <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('warehouse.add_new')}</CardTitle>
          <CardDescription>{t('warehouse.add_description')}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="warehouse-name">{t('warehouse.name')}</Label>
            <Input
              id="warehouse-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('warehouse.name_placeholder')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('warehouse.status')}</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: 'Low' | 'Medium' | 'High') => 
                handleInputChange('status', value)
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('warehouse.select_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">{t('warehouse.status.low')}</SelectItem>
                <SelectItem value="Medium">{t('warehouse.status.medium')}</SelectItem>
                <SelectItem value="High">{t('warehouse.status.high')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">{t('warehouse.level')}</Label>
              <Input
                id="level"
                type="number"
                min="0"
                value={formData.level}
                onChange={(e) => handleInputChange('level', parseInt(e.target.value) || 0)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">{t('warehouse.value')}</Label>
              <Input
                id="value"
                type="number"
                min="0"
                value={formData.value}
                onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('warehouse.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('warehouse.description_placeholder')}
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
            {isLoading ? t('warehouse.creating') : t('warehouse.create')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default AddWarehouse
