"use client"

import { useState } from "react"
import { OrderList } from "@/components/Orders/List/OrderList"
import { AddOrder } from "@/components/Orders/Form/AddOrder"
import OrderDetails from "@/components/Orders/Details/OrderDetails"
import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout" 
import { SalesAttributes } from "@/models/Sales"

// Add proper interface for OrderList props
interface OrderListProps {
  onOrderClick: (order: SalesAttributes) => void;
  onAddOrder: () => void;
}

export default function OrdersPage() {
  const [view, setView] = useState<"list" | "add" | "details">("list")
  const [selectedOrder, setSelectedOrder] = useState<SalesAttributes | null>(null)

  const handleOrderClick = (orderId: string) => {
    if (!orderId) return;
    
    setSelectedOrder({ 
      id: orderId,
      // Add other required fields from SalesAttributes if needed
    } as SalesAttributes);
    setView("details");
  }

  const handleAddOrder = () => {
    setView("add")
  }
  const handleBack = () => {
    setView("list")
    setSelectedOrder(null)
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        {view === "list" && (
          <OrderList 
            onOrderClick={handleOrderClick} 
            onAddOrder={handleAddOrder} 
          />
        )}
        {view === "add" && (
          <AddOrder onBack={handleBack} />
        )}
        {view === "details" && selectedOrder && selectedOrder.id && (
          <OrderDetails 
            orderId={selectedOrder.id} 
            onBack={handleBack} 
          />
        )}
      </div>
    </DashboardLayout>
  )
}
