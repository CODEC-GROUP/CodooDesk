'use client'

import { Button } from "@/components/Shared/ui/button"
import { Package, Plus } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  onAddProduct?: () => void;
}

export function EmptyState({ onAddProduct }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50/30 rounded-lg">
      <div className="relative mb-3">
        <Package className="w-12 h-12 text-gray-400" />
        <Plus className="w-6 h-6 text-gray-400 absolute -bottom-1 -right-1" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No Products Available</h3>
      <p className="text-gray-600 mb-4 text-center max-w-sm">
        Add products to your inventory to start selling
      </p>
      <div className="flex gap-2">
        <Link href="/products">
          <Button 
            variant="outline"
            className="shadow-sm hover:bg-gray-100"
          >
            View Products
          </Button>
        </Link>
        <Button 
          onClick={onAddProduct}
          className="bg-[#1A7DC0] text-white shadow-sm hover:bg-[#1A7DC0]/90"
        >
          Add Product
        </Button>
      </div>
    </div>
  )
}
