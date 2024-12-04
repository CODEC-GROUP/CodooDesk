'use client'

import { Button } from "@/components/Shared/ui/button"
import { ReceiptIcon } from 'lucide-react'

export function EmptyState({ onAddOrder }: { onAddOrder: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]"> {/* Added overflow handling */}
      <ReceiptIcon className="w-16 h-16 text-gray-400 mb-4" />
      <h2 className="text-2xl font-bold mb-2">No Orders Yet</h2>
      <p className="text-gray-600 mb-4 text-center max-w-md">
        All the upcoming orders from your store will be visible in this page.
        You can add orders by yourself if you sell offline.
      </p>
      <Button onClick={onAddOrder}>+ Add Order</Button>
      <a href="#" className="text-blue-500 hover:underline mt-4">Read More</a>
    </div>
  )
}