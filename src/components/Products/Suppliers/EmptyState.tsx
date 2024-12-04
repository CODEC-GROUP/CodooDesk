'use client'

import { Button } from "@/components/Shared/ui/button"
import { Building2, TruckIcon } from 'lucide-react'

interface EmptyStateProps {
  onAddSupplier: () => void;
}

export function EmptyState({ onAddSupplier }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
      <div className="relative mb-4">
        <Building2 className="w-16 h-16 text-gray-400" />
        <TruckIcon className="w-8 h-8 text-gray-400 absolute -bottom-2 -right-2" />
      </div>
      <h2 className="text-2xl font-bold mb-2">No Suppliers Added</h2>
      <p className="text-gray-600 mb-4 text-center max-w-md">
        Start building your supply chain by adding your first supplier. 
        Keep track of your vendors and manage your inventory sources effectively.
      </p>
      <Button 
        onClick={onAddSupplier}
        className="bg-[#1A7DC0] text-white shadow hover:bg-[#1A7DC0]/90"
      >
        Add Your First Supplier
      </Button>
    </div>
  )
} 