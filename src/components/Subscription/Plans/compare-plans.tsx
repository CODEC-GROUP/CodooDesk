'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { Check, X } from "lucide-react"

const plans = [
  {
    name: "Basic",
    price: "14,900 XAF",
    duration: "3 MONTHS",
    description: "Start your business",
    features: {
      "Cloud Backup": true,
      "Order Tracking": true,
      "File Sharing": true,
      "24/7 Support": true,
      "Multi-Device": true,
      "Analytics Reports": false,
      "Unlimited Storage": false,
      "Full Data Export": false,
      "Up to 100 Products": false,
      "Chat Inbox": false,
    },
  },
  {
    name: "Standard",
    price: "49,0000 XAF",
    duration: "6 MONTHS",
    description: "Start your business",
    features: {
      "Cloud Backup": true,
      "Order Tracking": true,
      "File Sharing": true,
      "24/7 Support": true,
      "Multi-Device": false,
      "Analytics Reports": true,
      "Unlimited Storage": false,
      "Full Data Export": true,
      "Up to 100 Products": true,
      "Chat Inbox": true,
    },
  },
  {
    name: "Premium",
    price: "99,000 XAF",
    duration: "12 MONTHS",
    description: "Start your business",
    features: {
      "Cloud Backup": true,
      "Order Tracking": true,
      "File Sharing": true,
      "24/7 Support": true,
      "Multi-Device": true,
      "Analytics Reports": true,
      "Unlimited Storage": true,
      "Full Data Export": true,
      "Up to 100 Products": true,
      "Chat Inbox": true,
    },
  },
]

export function ComparePlans() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Feature</TableHead>
          {plans.map((plan) => (
            <TableHead key={plan.name} className="text-center">
              {plan.name}
              <div className="font-normal text-sm">{plan.price}</div>
              <div className="font-normal text-sm">{plan.duration}</div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.keys(plans[0].features).map((feature) => (
          <TableRow key={feature}>
            <TableCell className="font-medium">{feature}</TableCell>
            {plans.map((plan) => (
              <TableCell key={`${plan.name}-${feature}`} className="text-center">
                {plan.features[feature as keyof typeof plan.features] ? (
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                ) : (
                  <X className="h-5 w-5 text-red-500 mx-auto" />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}