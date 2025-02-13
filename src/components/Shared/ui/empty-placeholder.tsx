import * as React from "react"

export function EmptyPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
      {children}
    </div>
  )
} 