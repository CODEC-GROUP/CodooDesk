'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Shared/ui/tabs"
import { Settings as GeneralSettings } from '@/components/General_Settings/settings'
import { ShopSettings } from '@/components/Settings/ShopSettings'
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'

export default function SettingsPage() {
  const { user } = useAuthLayout();
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          {/* Only show shop settings for admin/owner */}
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <TabsTrigger value="shops">Shop Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        {(user?.role === 'admin' || user?.role === 'owner') && (
          <TabsContent value="shops">
            <ShopSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
} 