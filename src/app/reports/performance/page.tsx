import { FinancialReports } from '@/components/Reports/financial-reports'
import { DashboardLayout } from '@/components/Shared/Layout/DashboardLayout'

export default function DashboardPage() {
  return (
    <DashboardLayout>
        <FinancialReports />
    </DashboardLayout>
  )
}
