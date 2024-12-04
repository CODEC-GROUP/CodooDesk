'use client'

import { Button } from "@/components/Shared/ui/button"
import { Users2, UserPlus } from 'lucide-react'

interface EmptyStateProps {
  onAddEmployee: () => void;
}

export function EmptyState({ onAddEmployee }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50/30">
      <div className="relative mb-4">
        <Users2 className="w-20 h-20 text-gray-400" />
        <UserPlus className="w-10 h-10 text-gray-400 absolute -bottom-2 -right-2" />
      </div>
      <h2 className="text-3xl font-bold mb-2">No Employees Added</h2>
      <p className="text-gray-600 mb-6 text-center max-w-md text-lg">
        Start building your team by adding your first employee. 
        Manage your staff and track their performance effectively.
      </p>
      <Button 
        onClick={onAddEmployee}
        className="bg-[#1A7DC0] text-white shadow-lg hover:bg-[#1A7DC0]/90 px-8 py-6 text-lg h-auto"
      >
        Add Your First Employee
      </Button>
    </div>
  )
}
