'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/Shared/Layout/DashboardLayout'
import { InventoryList } from '@/components/Inventory/InventoryList/Inventory-list'

export default function ProductInventoryPage({ params }: { params: { productId: string } }) {
  const router = useRouter();
  
  const handleBack = () => {
    router.back();
  };
  
  return (
    <DashboardLayout>
      <InventoryList 
        productId={params.productId}
        onBack={handleBack}
        parentView="product"
      />
    </DashboardLayout>
  )
} 