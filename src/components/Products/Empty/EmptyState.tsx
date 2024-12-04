'use client'

import { Button } from "@/components/Shared/ui/button"
import { Package, PlusCircle } from 'lucide-react'

interface EmptyStateProps {
  onAddProduct: () => void;
}

export function EmptyState({ onAddProduct }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50/30">
      <div className="relative mb-4">
        <Package className="w-20 h-20 text-gray-400" />
        <PlusCircle className="w-10 h-10 text-gray-400 absolute -bottom-2 -right-2" />
      </div>
      <h2 className="text-3xl font-bold mb-2">No Products Added</h2>
      <p className="text-gray-600 mb-6 text-center max-w-md text-lg">
        Start building your inventory by adding your first product. 
        Keep track of your items and manage your stock effectively.
      </p>
      <Button 
        onClick={onAddProduct}
        className="bg-[#1A7DC0] text-white shadow-lg hover:bg-[#1A7DC0]/90 px-8 py-6 text-lg h-auto"
      >
        Add Your First Product
      </Button>
    </div>
  )
}
