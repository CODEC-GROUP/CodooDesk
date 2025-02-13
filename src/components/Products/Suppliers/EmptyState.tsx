'use client'

import { Button } from "@/components/Shared/ui/button"
import { Building2, TruckIcon } from 'lucide-react'

interface EmptyStateProps {
  onAddSupplier: () => void;
}

export function EmptyState({ onAddSupplier }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 bg-gray-50">
      <div className="relative mb-8 group">
        <div className="w-24 h-24 rounded-full bg-blue-50/50 flex items-center justify-center border-2 border-blue-100">
          <Building2 className="w-12 h-12 text-blue-600" />
          <TruckIcon className="w-8 h-8 text-blue-600 bg-blue-100 p-1.5 rounded-full border-2 border-blue-200 absolute -bottom-2 -right-2" />
        </div>
      </div>
      <h3 className="text-3xl font-semibold tracking-tight mb-3 text-gray-900">
        No Suppliers Added
      </h3>
      <p className="text-muted-foreground mb-8 text-center max-w-md text-lg leading-relaxed">
        Build your vendor network by adding suppliers. Manage contacts, lead times, and procurement details in one place.
      </p>
      <Button 
        onClick={onAddSupplier}
        variant="default"
        size="lg"
        className="rounded-full px-8 py-6 text-lg gap-2 shadow-lg hover:shadow-md transition-shadow"
      >
        <TruckIcon className="w-6 h-6" />
        Add Supplier
      </Button>
    </div>
  )
} 