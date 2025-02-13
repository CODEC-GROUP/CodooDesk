'use client'

import { Button } from "@/components/Shared/ui/button"
import { Package, PlusCircle } from 'lucide-react'

interface EmptyStateProps {
  onAddProduct: () => void;
}

export function EmptyState({ onAddProduct }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 py-12 px-4 rounded-xl">
      <div className="relative mb-6">
        <Package className="w-24 h-24 text-gray-400/90" />
        <PlusCircle className="w-12 h-12 text-[#1A7DC0] absolute -bottom-3 -right-3 bg-background rounded-full" />
      </div>
      <h2 className="text-4xl font-bold mb-3 text-gray-900 tracking-tight">
        No Products Found
      </h2>
      <p className="text-gray-600 mb-8 text-center max-w-lg text-base">
        Start building your inventory by adding your first product. 
        Keep track of your items and manage your stock effectively.
      </p>
      <Button 
        onClick={onAddProduct}
        size="lg"
        className="gap-1.5 text-lg px-6 py-5 transition-transform hover:scale-[1.02]"
      >
        <PlusCircle className="w-5 h-5" />
        Add First Product
      </Button>
    </div>
  )
}
