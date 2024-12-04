import Expenses from '@/components/Reports/Expenses/Empty/expenses'
import { DashboardLayout } from '@/components/Shared/Layout/DashboardLayout'

export default function DashboardPage() {
  return (
    <DashboardLayout>
        <Expenses />
    </DashboardLayout>
  )
}
