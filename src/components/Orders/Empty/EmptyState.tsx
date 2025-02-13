'use client'

import { Button } from "@/components/Shared/ui/button"
import { ShoppingBag, Receipt } from 'lucide-react'

interface EmptyStateProps {
  onAddOrder: () => void;
  type?: 'order' | 'return';
}

export function EmptyState({ onAddOrder, type = 'order' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 bg-gray-50">
      <div className="relative mb-8 group">
        <div className="w-24 h-24 rounded-full bg-purple-50/50 flex items-center justify-center border-2 border-purple-100">
          <ShoppingBag className="w-12 h-12 text-purple-600" />
          <Receipt className="w-8 h-8 text-purple-600 bg-purple-100 p-1.5 rounded-full border-2 border-purple-200 absolute -bottom-2 -right-2" />
        </div>
      </div>
      <h3 className="text-3xl font-semibold tracking-tight mb-3 text-gray-900">
        {type === 'order' ? 'No Orders Found' : 'No Returns Found'}
      </h3>
      <p className="text-muted-foreground mb-8 text-center max-w-md text-lg leading-relaxed">
        {type === 'order' 
          ? 'Start creating orders to see them listed here. Your sales history will appear once you make your first transaction.'
          : 'Processed returns will appear here. Use the button below to initiate a return process.'}
      </p>
      <Button 
        onClick={onAddOrder}
        variant="default"
        size="lg"
        className="rounded-full px-8 py-6 text-lg gap-2 shadow-lg hover:shadow-md transition-shadow"
      >
        {type === 'order' ? (
          <>
            <ShoppingBag className="w-6 h-6" />
            Create First Order
          </>
        ) : (
          <>
            <Receipt className="w-6 h-6" />
            Initiate Return
          </>
        )}
      </Button>
    </div>
  )
}
