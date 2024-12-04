'use client'

import { Button } from "@/components/Shared/ui/button"
import { UserIcon } from 'lucide-react'

interface NoEmployeesProps {
  onAddEmployee: () => void;
}

export function NoEmployees({ onAddEmployee }: NoEmployeesProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] overflow-y-auto"> {/* Added overflow handling */}
      <UserIcon className="w-16 h-16 text-gray-400 mb-4" />
      <h2 className="text-2xl font-bold mb-2">No Employees Yet</h2>
      <p className="text-gray-600 mb-4 text-center max-w-md">
        Start by adding your first employee to manage your team effectively.
      </p>
      <Button onClick={onAddEmployee}>+ Add Employee</Button>
    </div>
  )
}
