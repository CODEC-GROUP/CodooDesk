'use client'

import { Button } from "@/components/Shared/ui/button"
import { RotateCcw, PackageX } from 'lucide-react'

interface EmptyStateProps {
  onCreateReturn: () => void;
}

export function EmptyState({ onCreateReturn }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 bg-gray-50">
      <div className="relative mb-8 group">
        <div className="w-24 h-24 rounded-full bg-blue-50/50 flex items-center justify-center border-2 border-blue-100">
          <PackageX className="w-12 h-12 text-blue-600" />
          <RotateCcw className="w-8 h-8 text-blue-600 bg-blue-100 p-1.5 rounded-full border-2 border-blue-200 absolute -bottom-2 -right-2" />
        </div>
      </div>
      <h3 className="text-3xl font-semibold tracking-tight mb-3 text-gray-900">
        No Returns Processed
      </h3>
      <p className="text-muted-foreground mb-8 text-center max-w-md text-lg leading-relaxed">
        Track and manage product returns. Processed returns will appear here with detailed status updates and customer communications.
      </p>
      <Button 
        onClick={onCreateReturn}
        variant="default"
        size="lg"
        className="rounded-full px-8 py-6 text-lg gap-2 shadow-lg hover:shadow-md transition-shadow"
      >
        <RotateCcw className="w-6 h-6" />
        Process Return
      </Button>
    </div>
  )
}
