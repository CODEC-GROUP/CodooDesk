'use client'

import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Avatar, AvatarFallback } from "@/components/Shared/ui/avatar"
import { Badge } from "@/components/Shared/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { ChevronLeft, ClipboardList } from "lucide-react"
import { Employee } from "@/types/employee"
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { useEffect, useState } from 'react';
import { SecurityLog } from "@/types/securityLog"
import { safeIpcInvoke } from '@/lib/ipc';

interface EmployeeDetailsProps {
  employee: Employee;
  onBack: () => void;
}

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
  const { user, business, availableShops } = useAuthLayout();
  const [activities, setActivities] = useState<SecurityLog[]>([]);
  const [error, setError] = useState('');

  const currentShop = (user?.role === 'admin' || user?.role === 'shop_owner')
    ? business?.shops?.find(shop => shop.id === employee.shopId)
    : availableShops?.find(shop => shop.id === employee.shopId);

  const fetchActivities = async () => {
    try {
      const response = await safeIpcInvoke<SecurityLog[]>(
        'getEmployeeActivities',
        { userId: employee.user?.id ?? '' },
        []
      );

      if (response) {
        setActivities(response);
        setError('');
      } else {
        setError('Failed to load activities');
      }
    } catch (err) {
      setError('Failed to load activities');
    }
  };

  useEffect(() => {
    if (employee.user?.id) {
      fetchActivities();
    }
  }, [employee.user?.id]);

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center h-24">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ClipboardList className="h-8 w-8" />
                        No activities recorded yet
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>{activity.event_type}</TableCell>
                      <TableCell>
                        {new Date(activity.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
