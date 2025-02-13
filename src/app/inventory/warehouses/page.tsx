import { WarehouseList } from "@/components/Warehouse/List/WarehouseList";
import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout";

export default function WarehousesPage() {
  return (
    <DashboardLayout>
      <WarehouseList />
    </DashboardLayout>
  );
}