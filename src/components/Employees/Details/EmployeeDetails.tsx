'use client'

import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Avatar, AvatarFallback } from "@/components/Shared/ui/avatar"
import { Badge } from "@/components/Shared/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { ChevronLeft } from "lucide-react"
import { Employee } from "@/types/employee"

interface EmployeeDetailsProps {
  employee: Employee;
  onBack: () => void;
}

const employeeActivities = [
  { id: 1, action: "Logged in", date: "2023-05-15 09:00:00", performance: "Good" },
  { id: 2, action: "Processed order #1234", date: "2023-05-15 10:30:00", performance: "Excellent" },
  { id: 3, action: "Updated inventory", date: "2023-05-15 14:15:00", performance: "Good" },
  { id: 4, action: "Handled customer inquiry", date: "2023-05-15 16:45:00", performance: "Average" },
]

const getRoleColor = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-[#E8FFF3] text-[#03A734]'
    case 'seller':
      return 'bg-[#EEF2FF] text-[#3F5BF6]'
    case 'manager':
      return 'bg-[#FFF4ED] text-[#FF8E29]'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function EmployeeDetails({ employee, onBack }: EmployeeDetailsProps) {
  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Employees
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Employee Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-4">
              <Avatar className="w-24 h-24 mb-4 bg-[#EEF2FF] text-[#3F5BF6]">
                <AvatarFallback className="text-3xl">{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-semibold">{employee.firstName} {employee.lastName}</h2>
              <Badge className={`mt-2 font-medium ${getRoleColor(employee.user?.role || employee.role)}`}>
                {employee.user?.role || employee.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <p><strong>Phone:</strong> {employee.phone}</p>
              <p><strong>Email:</strong> {employee.user?.email}</p>
              <p><strong>Employment Status:</strong> {employee.employmentStatus}</p>
              <p><strong>Hire Date:</strong> {new Date(employee.hireDate).toLocaleDateString()}</p>
              {employee.dateOfBirth && (
                <p><strong>Date of Birth:</strong> {new Date(employee.dateOfBirth).toLocaleDateString()}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Employee Activities and Performance</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{activity.date}</TableCell>
                    <TableCell>{activity.performance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
