"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Shared/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Switch } from "@/components/Shared/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Shared/ui/table"
import { X, Eye, EyeOff } from "lucide-react"
import { useAuthLayout } from '../Shared/Layout/AuthLayout'
import { safeIpcInvoke } from '@/lib/ipc'
import { toast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { useLanguage } from '@/providers/LanguageProvider'

// Add this near the top of the file, after imports
interface SettingsResponse {
  success: boolean;
  settings: any; // Replace 'any' with your actual settings type if known
}

// Mock data for login history
const loginHistory = [
  { id: 1, date: "2023-05-15 10:30:00", device: "Chrome on Windows", location: "Douala, Cameroon" },
  { id: 2, date: "2023-05-14 15:45:00", device: "Safari on iPhone", location: "Yaoundé, Cameroon" },
  { id: 3, date: "2023-05-13 09:15:00", device: "Firefox on MacOS", location: "Buea, Cameroon" },
  { id: 4, date: "2023-05-12 18:20:00", device: "Chrome on Android", location: "Bamenda, Cameroon" },
]

export function Settings() {
  const { business } = useAuthLayout()
  const [activeTab, setActiveTab] = useState("profile")
  const [showLoginHistory, setShowLoginHistory] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const t = useTranslations('settings')
  const { locale, setLocale } = useLanguage()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (!business?.id) return
        
        const response = await safeIpcInvoke('settings:business:get', { 
          businessId: business.id 
        }) as SettingsResponse
        
        if (response?.success) {
          setSettings(response.settings)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        })
      }
    }

    loadSettings()
  }, [business?.id])

  const handleSaveSettings = async (section: string, data: any) => {
    try {
      if (!business?.id) return

      const response = await safeIpcInvoke(`settings:business:update-${section}`, {
        businessId: business.id,
        settings: data
      }) as SettingsResponse

      if (response?.success) {
        toast({
          title: "Success",
          description: "Settings updated successfully",
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">{t('profile.title')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('notifications.title')}</TabsTrigger>
          <TabsTrigger value="security">{t('security.title')}</TabsTrigger>
          <TabsTrigger value="units">{t('units.title')}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.title')}</CardTitle>
              <CardDescription>{t('profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-image">Profile Image</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Button variant="outline">Add File</Button>
                  <p className="text-sm text-gray-500 mt-2">Or drag and drop files</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="Enter your first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Enter your last name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="Enter your phone number" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Regional Settings</h3>
                <p className="text-sm text-gray-500">Set your language and timezone</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmt">GMT +00:00</SelectItem>
                      <SelectItem value="est">EST -05:00</SelectItem>
                      <SelectItem value="pst">PST -08:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage your notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Personalized Offers</h3>
                  <p className="text-sm text-gray-500">Receive offers made special for you</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">New Features</h3>
                  <p className="text-sm text-gray-500">Updates about new features and product releases</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Security and Billing</h3>
                  <p className="text-sm text-gray-500">Account security and notifications about billing</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input id="current-password" type={showPassword ? "text" : "password"} />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input id="new-password" type={showPassword ? "text" : "password"} />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input id="confirm-password" type={showPassword ? "text" : "password"} />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Login History</h3>
                <p className="text-sm text-gray-500">View your recent login activity</p>
                <Button variant="outline" onClick={() => setShowLoginHistory(true)}>View Login History</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="units" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Units Settings</CardTitle>
              <CardDescription>Manage units for different product types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight-unit">Weight Unit</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select weight unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="lb">Pounds</SelectItem>
                    <SelectItem value="g">Grams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="volume-unit">Volume Unit</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select volume unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="l">Liters</SelectItem>
                    <SelectItem value="ml">Milliliters</SelectItem>
                    <SelectItem value="gallon">Gallons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="length-unit">Length Unit</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select length unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="cm">Centimeters</SelectItem>
                    <SelectItem value="in">Inches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Add more units as needed */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="mt-6 flex justify-end space-x-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </div>

      {showLoginHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Login History</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowLoginHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.map((login) => (
                    <TableRow key={login.id}>
                      <TableCell>{login.date}</TableCell>
                      <TableCell>{login.device}</TableCell>
                      <TableCell>{login.location}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-4">
        <Select value={locale} onValueChange={setLocale}>
          <SelectTrigger>
            <SelectValue placeholder="Select Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}