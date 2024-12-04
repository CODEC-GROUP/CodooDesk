"use client"

import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout"
import { Subscription } from "@/components/Subscription/Plans/PlanList"

export default function SubscriptionPage() {
  return (
    <DashboardLayout>
      <Subscription />
    </DashboardLayout>
  )
}
