'use client'

import { Button } from "@/components/Shared/ui/button"
import { RotateCcw, PackageX } from 'lucide-react'

interface EmptyStateProps {
  onCreateReturn: () => void;
}

export function EmptyState({ onCreateReturn }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50/30">
      <div className="relative mb-4">
        <PackageX className="w-20 h-20 text-gray-400" />
        <RotateCcw className="w-10 h-10 text-gray-400 absolute -bottom-2 -right-2" />
      </div>
      <h2 className="text-3xl font-bold mb-2">No Returns Processed</h2>
      <p className="text-gray-600 mb-6 text-center max-w-md text-lg">
        Track and manage your product returns here.
        All processed returns will be listed in this section.
      </p>
      <Button 
        onClick={onCreateReturn}
        className="bg-[#1A7DC0] text-white shadow-lg hover:bg-[#1A7DC0]/90 px-8 py-6 text-lg h-auto"
      >
        Process a Return
      </Button>
    </div>
  )
}
