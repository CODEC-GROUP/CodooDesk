'use client'

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ChevronLeft } from "lucide-react"
import { roles } from '../Lib/constants'
import { Employee } from "@/types/employee"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout";
import { Checkbox } from "@/components/Shared/ui/checkbox"

interface AddEditEmployeeProps {
  onBack: () => void;
  onSave: (employee: Employee) => void;
  employee: Employee | null;
  isEdit: boolean;
}

interface EmployeeResponse {
  success: boolean;
  employee?: Employee;
  message?: string;
}

export function AddEditEmployee({ onBack, onSave, employee, isEdit }: AddEditEmployeeProps) {
  const { business, user, availableShops } = useAuthLayout();
  
  // Log for debugging
  console.log('Business in AddEmployee:', business);
  console.log('Shops available:', business?.shops);

  if (!['admin', 'shop_owner', 'manager'].includes(user?.role || '')) {
    return (
      <div className="p-4 text-center text-red-500">
        Unauthorized access
      </div>
    );
  }

  const [formData, setFormData] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.user?.email || '',
    phone: employee?.phone || '',
    role: employee?.role || 'seller',
    employmentStatus: employee?.employmentStatus || 'full-time',
    salary: employee?.salary || 0,
    shopId: employee?.shopId || (user?.role !== 'admin' && user?.role !== 'shop_owner') 
      ? availableShops?.[0]?.id || ''
      : '',
    username: employee?.user?.username || '',
    password_hash: '',
    businessId: business?.id || '',
  });

  // Add state for password update
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [passwordUpdate, setPasswordUpdate] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password update if shown
    if (showPasswordUpdate) {
      if (passwordUpdate.newPassword !== passwordUpdate.confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      if (!business?.id) {
        toast({
          title: "Error",
          description: "Business information is missing",
          variant: "destructive",
        });
        return;
      }

      if (!formData.shopId) {
        toast({
          title: "Error",
          description: "Please select a shop",
          variant: "destructive",
        });
        return;
      }

      if (isEdit && employee) {
        const updates = {
          ...formData,
          role: formData.role,
          ...(showPasswordUpdate && {
            password_hash: passwordUpdate.newPassword
          })
        };

        const response = await safeIpcInvoke<EmployeeResponse>('entities:employee:update', {
          id: employee.id,
          updates: updates
        }, { success: false, employee: undefined, message: '' });

        if (response?.success && response.employee) {
          toast({
            title: "Success",
            description: "Employee updated successfully",
          });
          onSave(response.employee);
        } else {
          toast({
            title: "Error",
            description: "Failed to update employee",
            variant: "destructive",
          });
        }
      } else {
        const response = await safeIpcInvoke('entities:employee:create', {
          employeeData: {
            ...formData,
            shopId: formData.shopId
          }
        }, { success: false } as EmployeeResponse);

        if (response?.success && response.employee) {
          toast({
            title: "Success",
            description: "Employee created successfully",
          });
          onSave(response.employee);
        } else {
          toast({
            title: "Error",
            description: "Failed to create employee",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      toast({
        title: "Error",
        description: "Failed to save employee",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" className="mr-2" onClick={onBack}>Cancel</Button>
          <Button className="bg-[#2D70FD]" onClick={handleSubmit}>Save</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
          <p className="text-sm text-gray-500">Fill in the employee details</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Information</h3>
              <label>
                First Name
                <Input
                  placeholder="Enter the first name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </label>
              <label>
                Last Name
                <Input
                  placeholder="Enter the last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </label>
              <label>
                Email Address
                <Input
                  type="email"
                  placeholder="Enter the email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </label>
              <label>
                Phone Number
                <Input
                  placeholder="Enter the phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </label>
            </div>

            {/* Employment Details */}
            <div className="space-y-4">
              <h3 className="font-medium">Employment Details</h3>
              <label>
                Role
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label>
                Employment Status
                <Select
                  value={formData.employmentStatus}
                  onValueChange={(value: any) => setFormData({ ...formData, employmentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="part-time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label>
                Salary
                <Input
                  type="number"
                  placeholder="Enter the salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                />
              </label>

              <div className="space-y-4">
                <h3 className="font-medium">Assign to Shops</h3>
                <div className="space-y-2">
                  {business?.shops?.map((shop: any) => (
                    <div key={shop.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={shop.id}
                        checked={formData.shopId === shop.id}
                        onCheckedChange={(checked) => {
                          setFormData(prev => ({
                            ...prev,
                            shopId: checked ? shop.id : ''
                          }));
                        }}
                      />
                      <label
                        htmlFor={shop.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {shop.name || 'Unnamed Shop'}
                      </label>
                    </div>
                  ))}
                </div>
                {formData.shopId === '' && (
                  <p className="text-sm text-red-500">Please select a shop</p>
                )}
              </div>
            </div>

            {/* Account Credentials - Only show for new employees */}
            {!isEdit && (
              <div className="space-y-4">
                <h3 className="font-medium">Account Credentials</h3>
                <label>
                  Username
                  <Input
                    placeholder="Enter a username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </label>
                <label>
                  Password
                  <Input
                    type="password"
                    placeholder="Enter a password"
                    value={formData.password_hash}
                    onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                  />
                </label>
              </div>
            )}

            {/* Password Update Section */}
            {isEdit && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">Update Password</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordUpdate(!showPasswordUpdate)}
                  >
                    {showPasswordUpdate ? 'Cancel' : 'Change Password'}
                  </Button>
                </div>

                {showPasswordUpdate && (
                  <>
                    <label>
                      New Password
                      <Input
                        type="password"
                        value={passwordUpdate.newPassword}
                        onChange={(e) => setPasswordUpdate({
                          ...passwordUpdate,
                          newPassword: e.target.value
                        })}
                      />
                    </label>
                    <label>
                      Confirm Password
                      <Input
                        type="password"
                        value={passwordUpdate.confirmPassword}
                        onChange={(e) => setPasswordUpdate({
                          ...passwordUpdate,
                          confirmPassword: e.target.value
                        })}
                      />
                    </label>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
