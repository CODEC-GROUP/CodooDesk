'use client'

import { useState } from 'react'
import { ProductList } from '@/components/Products/List/ProductList'
import { AddProduct } from '@/components/Products/Form/AddProduct'
import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout"
import type { ReactNode } from 'react'

export default function ProductsPage() {
  const [view, setView] = useState<'list' | 'add'>('list')
  
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
