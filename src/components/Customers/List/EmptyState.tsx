'use client'

import { Button } from "@/components/Shared/ui/button"
import { Users, UserPlus } from 'lucide-react'

interface EmptyStateProps {
  onAddCustomer: () => void;
}

export function EmptyState({ onAddCustomer }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
      <div className="relative mb-4">
        <Users className="w-16 h-16 text-gray-400" />
        <UserPlus className="w-8 h-8 text-gray-400 absolute -bottom-2 -right-2" />
      </div>
      <h2 className="text-2xl font-bold mb-2">No Customers Added</h2>
      <p className="text-gray-600 mb-4 text-center max-w-md">
        Start building your customer base by adding your first customer. 
        Keep track of your customers and manage your relationships effectively.
      </p>
      <Button 
        onClick={onAddCustomer}
        className="bg-[#1A7DC0] text-white shadow hover:bg-[#1A7DC0]/90"
      >
        Add Your First Customer
      </Button>
    </div>
  )
}
