import { Shops } from '@/components/Shop/List/ShopGrid'
import { DashboardLayout } from '@/components/Shared/Layout/DashboardLayout'

export default function DashboardPage() {
  return (
    <DashboardLayout>
        <Shops />
    </DashboardLayout>
  )
}
