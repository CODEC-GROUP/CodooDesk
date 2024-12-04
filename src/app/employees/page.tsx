"use client"

import { useState } from "react"
import { EmployeeList } from "@/components/Employees/List/EmployeeList"
import { AddEditEmployee } from "@/components/Employees/Form/AddEmployee"
import { EmployeeDetails } from "@/components/Employees/Details/EmployeeDetails"
import { Employee } from "@/types/employee"
import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout"

export default function EmployeesPage() {
  const [view, setView] = useState<'list' | 'add' | 'details'>('list')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setView('details')
  }

  const handleAddEmployee = () => {
    setSelectedEmployee(null)
    setView('add')
  }

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setView('add')
  }

  const handleBack = () => {
    setView('list')
    setSelectedEmployee(null)
  }

  const handleSave = (employee: Employee) => {
    // Refresh the list or update local state as needed
    setView('list')
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        {view === 'list' && (
          <EmployeeList
            onEmployeeClick={handleEmployeeClick}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
          />
        )}
        {view === 'add' && (
          <AddEditEmployee
            onBack={handleBack}
            onSave={handleSave}
            employee={selectedEmployee}
            isEdit={!!selectedEmployee}
          />
        )}
        {view === 'details' && selectedEmployee && (
          <EmployeeDetails
            employee={selectedEmployee}
            onBack={handleBack}
          />
        )}
      </div>
    </DashboardLayout>
  )
}