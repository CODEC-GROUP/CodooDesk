import { useState, useEffect } from 'react';
import { safeIpcInvoke } from '@/lib/ipc';
import { useToast } from "@/components/Shared/ui/use-toast";
import { 
  DashboardResponse, 
  FinanceDashboardResponse,
  FinanceDashboardData 
} from '@/types/dashboard';
import { InventoryDashboardData } from '@/types/inventory';
import { IPC_CHANNELS } from '@/constants/ipcChannels';

interface DashboardParams {
  businessId: string;
  shopId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export function useDashboard() {
  const [inventoryData, setInventoryData] = useState<InventoryDashboardData | null>(null);
  const [financeData, setFinanceData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInventoryDashboard = async ({ businessId, shopId }: DashboardParams) => {
    try {
      setLoading(true);
      const response = await safeIpcInvoke<{ success: boolean; data?: InventoryDashboardData; message?: string }>(
        'dashboard:inventory:get',
        { businessId, shopId },
        { success: false }
      );

      if (!response) {
        throw new Error('No response received from server');
      }

      if (response.success && response.data) {
        setInventoryData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch inventory dashboard data');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inventory data';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceDashboard = async ({ businessId, shopId, dateRange }: DashboardParams) => {
    try {
      setLoading(true);
      const response = await safeIpcInvoke<{ success: boolean; data?: FinanceDashboardData; message?: string }>(
        IPC_CHANNELS.GET_FINANCE_DASHBOARD,
        { businessId, shopId, dateRange },
        { success: false }
      );

      if (!response) {
        throw new Error('No response received from server');
      }

      if (response.success && response.data) {
        setFinanceData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch finance dashboard data');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch finance data';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    inventoryData,
    financeData,
    loading,
    error,
    fetchInventoryDashboard,
    fetchFinanceDashboard
  };
} 