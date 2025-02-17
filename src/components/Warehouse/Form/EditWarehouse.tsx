"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ArrowLeft } from "lucide-react"
import { toast } from '@/hooks/use-toast'
import { safeIpcInvoke } from "@/lib/ipc"
import { useAppTranslation } from '@/hooks/useAppTranslation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"

interface EditWarehouseProps {
  warehouse: {
    id: string
    name: string
    description: string
    status: "Low" | "Medium" | "High"
    level: number
    value: number
  }
  onBack: () => void;
}

const EditWarehouse: React.FC<EditWarehouseProps> = ({ warehouse, onBack }) => {
  const { t } = useAppTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: warehouse.name,
    description: warehouse.description,
    status: warehouse.status,
    level: warehouse.level,
    value: warehouse.value
  })

  useEffect(() => {
    setFormData({
      name: warehouse.name,
      description: warehouse.description,
      status: warehouse.status,
      level: warehouse.level,
      value: warehouse.value
    })
  }, [warehouse])

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUpdateWarehouse = async () => {
    try {
      setIsLoading(true)
      
      if (!formData.name.trim()) {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('warehouse.name_required')
        })
        return
      }

      const response = await safeIpcInvoke<{ 
        success: boolean; 
        message?: string 
      }>('inventory:update', {
        id: warehouse.id,
        updates: {
          name: formData.name.trim(),
          description: formData.description.trim(),
          level: formData.level,
          value: formData.value,
          status: formData.status
        }
      })

      if (response?.success) {
        toast({ 
          title: t('success'), 
          description: t('warehouse.updated_successfully')
        })
        onBack()
      } else {
        throw new Error(response?.message || t('warehouse.update_failed'))
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: err instanceof Error ? err.message : t('warehouse.update_failed')
      })
    } finally {
      setIsLoading(false)
    }
  }

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
          <CardTitle>{t('warehouse.edit')}</CardTitle>
          <CardDescription>{t('warehouse.edit_description')}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Same form fields as AddWarehouse */}
          // ... existing form fields from AddWarehouse ...
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleUpdateWarehouse} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t('warehouse.updating') : t('warehouse.update')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default EditWarehouse 