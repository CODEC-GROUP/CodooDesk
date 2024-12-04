"use client"

import { useState } from "react"
import { CustomerList } from "@/components/Customers/List/CustomerList"
import { CustomerDetails } from "@/components/Customers/Details/CustomerDetails"
import { AddCustomer } from "@/components/Customers/Form/AddCustomer"
import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout"

interface Customer {
  id: number;
  name: string;
  phone: string;
  orders: number;
  spent: string;
}

export default function CustomersPage() {
  const [view, setView] = useState<"list" | "details" | "add">("list")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setView("details")
  }

  const handleAddCustomer = () => {
    setView("add")
  }

  const handleBack = () => {
    setView("list")
    setSelectedCustomer(null)
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {view === "list" && (
          <CustomerList
            onCustomerClick={handleCustomerClick}
            onAddCustomer={handleAddCustomer}
          />
        )}
        {view === "details" && selectedCustomer && (
          <CustomerDetails
            customer={selectedCustomer}
            onBack={handleBack}
          />
        )}
        {view === "add" && (
          <AddCustomer onBack={handleBack} />
        )}
      </div>
    </DashboardLayout>
  )
}