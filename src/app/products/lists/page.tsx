'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductList } from '@/components/Products/List/ProductList'
import { AddProduct } from '@/components/Products/Form/AddProduct'
import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout"
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'
import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

export default function ProductsPage() {
  const [view, setView] = useState<'list' | 'add'>('list')
  const { isAuthenticated, business } = useAuthLayout()
  const router = useRouter()
  
  // Add business ID check
  if (!business?.id) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8 text-destructive">
          <AlertCircle className="mr-2" />
          <span>Business configuration not loaded</span>
        </div>
      </div>
    );
  }

  const handleAddProduct = () => {
    setView('add')
  }

  const handleBackToList = () => {
    setView('list')
  }

  const content: ReactNode = (
    <div className="container mx-auto p-6">
      {view === 'list' && (
        <ProductList onAddProduct={handleAddProduct} />
      )}

      {view === 'add' && (
        <AddProduct onBack={handleBackToList} />
      )}
    </div>
  )

  return <DashboardLayout>{content}</DashboardLayout>
}
