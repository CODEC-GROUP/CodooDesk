import SettingsPage  from '@/components/Settings/SettingsPage'
import { DashboardLayout } from '@/components/Shared/Layout/DashboardLayout'

export default function DashboardPage() {
  return (
    <DashboardLayout>
        <SettingsPage />
    </DashboardLayout>
  )
}
