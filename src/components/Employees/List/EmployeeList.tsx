/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import { Avatar, AvatarFallback } from "@/components/Shared/ui/avatar"
import { Badge } from "@/components/Shared/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Search, Edit, Trash2 } from "lucide-react"
import { Employee } from "@/types/employee"
import { UserAttributes } from "@/models/User";
import { safeIpcInvoke } from '@/lib/ipc';
import { Toast, ToastProvider, ToastViewport } from '@/components/Shared/ui/toast';
import {toast} from '@/hooks/use-toast';
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout";
import { EmptyState } from '../Empty/EmptyState'

interface EmployeeListProps {
  onEmployeeClick: (employee: Employee) => void;
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
}

const roles: UserAttributes['role'][] = ['shop_owner', 'manager', 'seller', 'admin'];

export function EmployeeList({ onEmployeeClick, onAddEmployee, onEditEmployee }: EmployeeListProps) {
  const { business } = useAuthLayout();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    if (!business?.id) {
      setError('No business context found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching employees for business:', business.id);
      
      const response = await safeIpcInvoke('entities:employee:get-all', {
        businessId: business.id
      }, {
        success: false,
        employees: [],
        message: ''
      });

      if (response?.success) {
        setEmployees(response.employees);
      } else {
        setError(response?.message || 'Failed to load employees');
        toast({
          title: "Error",
          description: response?.message || "Failed to load employees",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const response = await safeIpcInvoke('entities:employee:delete', { 
        id: employeeId 
      }, { success: false });

      if (response?.success) {
        return (
          <ToastProvider>
            <Toast>
              Success: Employee deleted successfully
            </Toast>
            <ToastViewport />
          </ToastProvider>
        )
      } else {
        return (
          <ToastProvider>
            <Toast variant="destructive">
              Error: Failed to delete employee
            </Toast>
            <ToastViewport />
          </ToastProvider>
        )
      }
    } catch (error) {
      return (
        <ToastProvider>
          <Toast variant="destructive">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
    }
  };

  const handleUpdateStatus = async (employeeId: string, isActive: boolean) => {
    try {
      const response = await safeIpcInvoke('entities:employee:update', {
        id: employeeId,
        updates: { isActive }
      }, { success: false });

      if (response?.success) {
        return (
          <ToastProvider>
            <Toast>
              Success: Employee status updated successfully
            </Toast>
            <ToastViewport />
          </ToastProvider>
        )
      } else {
        return (
          <ToastProvider>
            <Toast variant="destructive">
              Error: Failed to update employee status
            </Toast>
            <ToastViewport />
          </ToastProvider>
        )
      }
    } catch (error) {
      return (
        <ToastProvider>
          <Toast variant="destructive">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
    }
  };

  useEffect(() => {
    if (business?.id) {
      fetchEmployees();
    }
  }, [business?.id]);

  const handleEmployeeClick = (employee: Employee) => {
    onEmployeeClick(employee)
  }

  const getRoleColor = (role: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">
          {error}
          <Button 
            onClick={fetchEmployees} 
            variant="outline" 
            className="ml-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {employees.length === 0 && !loading ? (
        <EmptyState onAddEmployee={onAddEmployee} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Employees</h1>
            <div className="space-x-2">
              <Button variant="outline" className="text-[#2D70FD] border-[#2D70FD]">Export</Button>
              <Button onClick={onAddEmployee} className="bg-[#2D70FD]">Add Employee</Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Employees</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto"> {/* Added scrollable area */}
              <div className="flex flex-col md:flex-row justify-between mb-4">
                <Select>
                  <SelectTrigger className="w-full md:w-[180px] mb-2 md:mb-0">
                    <SelectValue placeholder="Filter Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role?.toLowerCase() ?? 'shop_owner'}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-full md:w-[300px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search..." className="pl-8" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="flex justify-end space-x-2 mb-2">
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id} onClick={() => handleEmployeeClick(employee)} className="cursor-pointer">
                        <TableCell>
                          <Checkbox onClick={(e) => e.stopPropagation()} />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <Avatar className="bg-[#EEF2FF] text-[#3F5BF6]">
                              <AvatarFallback>{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
                            </Avatar>
                            <span>{employee.firstName} {employee.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell>
                          <Badge className={`font-medium ${getRoleColor(employee.user?.role || employee.role)}`}>
                            {employee.user?.role || employee.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => {
                            e.stopPropagation();
                            onEditEmployee(employee);
                          }}>
                            <Edit className="h-4 w-4 text-gray-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
