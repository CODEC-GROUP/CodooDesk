'use client'

import { Button } from "@/components/Shared/ui/button"
import { Users2, UserPlus } from 'lucide-react'

interface EmptyStateProps {
  onAddEmployee: () => void;
}

export function EmptyState({ onAddEmployee }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 bg-gray-50">
      <div className="relative mb-8 group">
        <div className="w-24 h-24 rounded-full bg-orange-50/50 flex items-center justify-center border-2 border-orange-100">
          <Users2 className="w-12 h-12 text-orange-600" />
          <UserPlus className="w-8 h-8 text-orange-600 bg-orange-100 p-1.5 rounded-full border-2 border-orange-200 absolute -bottom-2 -right-2" />
        </div>
      </div>
      <h3 className="text-3xl font-semibold tracking-tight mb-3 text-gray-900">
        No Team Members
      </h3>
      <p className="text-muted-foreground mb-8 text-center max-w-md text-lg leading-relaxed">
        Build your team by adding employees. Manage roles, schedules, and access levels in one centralized location.
      </p>
      <Button 
        onClick={onAddEmployee}
        variant="default"
        size="lg"
        className="rounded-full px-8 py-6 text-lg gap-2 shadow-lg hover:shadow-md transition-shadow"
      >
        <UserPlus className="w-6 h-6" />
        Add First Employee
      </Button>
    </div>
  )
}
