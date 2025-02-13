import { PurchaseHistoryTable } from '@/components/Inventory/purchase-history/PurchaseHistoryTable' // Check if this is exported
import { DashboardLayout } from '@/components/Shared/Layout/DashboardLayout';

export default function PurchaseHistoryPage() {
  return (
    <DashboardLayout> 
      <PurchaseHistoryTable /> 
    </DashboardLayout>);
}