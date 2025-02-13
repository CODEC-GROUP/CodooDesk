'use client'

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthLayout } from '../Shared/Layout/AuthLayout';
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../Shared/ui/card';
import { Button } from '../Shared/ui/button';
import { Input } from '../Shared/ui/input';
import { Switch } from '../Shared/ui/switch';
import { Label } from '../Shared/ui/label';

const settingsSchema = z.object({
  currency: z.string().min(1),
  language: z.string().min(1),
  timezone: z.string().min(1),
  taxRate: z.number().min(0).max(100),
  invoicePrefix: z.string().min(1),
  receiptPrefix: z.string().min(1),
  lowStockThreshold: z.number().min(0),
  enableStockAlerts: z.boolean(),
  enableCustomerLoyalty: z.boolean(),
  pointsPerPurchase: z.number().optional(),
  moneyPerPoint: z.number().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface IpcResponse {
  success: boolean;
  settings?: SettingsFormData;
  message?: string;
}

export function ShopSettings() {
  const { user, business } = useAuthLayout();
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, setValue, watch } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema)
  });

  const enableCustomerLoyalty = watch('enableCustomerLoyalty');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const shopId = localStorage.getItem('currentShopId');
        if (!shopId) return;

        const response = await safeIpcInvoke<IpcResponse>('settings:shop:get', { shopId }) as IpcResponse;
        if (response?.success && response.settings) {
          Object.entries(response.settings).forEach(([key, value]) => {
            setValue(key as keyof SettingsFormData, value);
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [setValue]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      const shopId = localStorage.getItem('currentShopId');
      if (!shopId) return;

      const response = await safeIpcInvoke<IpcResponse>('settings:shop:update', {
        shopId,
        settings: data
      });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Settings updated successfully",
        });
      } else {
        throw new Error(response?.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" {...register('currency')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input id="language" {...register('language')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...register('timezone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input 
                id="taxRate" 
                type="number" 
                {...register('taxRate', { valueAsNumber: true })} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
              <Input id="invoicePrefix" {...register('invoicePrefix')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptPrefix">Receipt Prefix</Label>
              <Input id="receiptPrefix" {...register('receiptPrefix')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enableStockAlerts">Enable Stock Alerts</Label>
            <Switch 
              id="enableStockAlerts"
              {...register('enableStockAlerts')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
            <Input 
              id="lowStockThreshold" 
              type="number"
              {...register('lowStockThreshold', { valueAsNumber: true })} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loyalty Program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enableCustomerLoyalty">Enable Loyalty Program</Label>
            <Switch 
              id="enableCustomerLoyalty"
              {...register('enableCustomerLoyalty')}
            />
          </div>
          {enableCustomerLoyalty && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pointsPerPurchase">Points Per Purchase</Label>
                <Input 
                  id="pointsPerPurchase" 
                  type="number"
                  {...register('pointsPerPurchase', { valueAsNumber: true })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moneyPerPoint">Money Per Point</Label>
                <Input 
                  id="moneyPerPoint" 
                  type="number"
                  step="0.01"
                  {...register('moneyPerPoint', { valueAsNumber: true })} 
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit">Save Settings</Button>
    </form>
  );
} 