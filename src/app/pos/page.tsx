'use client'

import { Pos } from '@/components/POS/Catalog/ProductGrid'
import { DashboardLayout } from '@/components/Shared/Layout/DashboardLayout'

export default function DashboardPage() {
  return (
    <DashboardLayout>
        <Pos />
    </DashboardLayout>
  )
}
