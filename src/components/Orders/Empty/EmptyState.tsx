'use client'

import { Button } from "@/components/Shared/ui/button"
import { ShoppingBag, Receipt } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  onStartSelling?: () => void;
}

export function EmptyState({ onStartSelling }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50/30">
      <div className="relative mb-4">
        <ShoppingBag className="w-20 h-20 text-gray-400" />
        <Receipt className="w-10 h-10 text-gray-400 absolute -bottom-2 -right-2" />
      </div>
      <h2 className="text-3xl font-bold mb-2">No Orders Yet</h2>
      <p className="text-gray-600 mb-6 text-center max-w-md text-lg">
        Start making sales and tracking your business performance.
        All your orders will appear here.
      </p>
      <Link href="/pos">
        <Button 
          onClick={onStartSelling}
          className="bg-[#1A7DC0] text-white shadow-lg hover:bg-[#1A7DC0]/90 px-8 py-6 text-lg h-auto"
        >
          Start Selling
        </Button>
      </Link>
    </div>
  )
}
