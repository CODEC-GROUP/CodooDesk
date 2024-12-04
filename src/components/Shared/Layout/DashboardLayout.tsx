'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/Shared/ui/avatar"
import {
  LayoutDashboard,
  ListOrdered,
  Tag,
  Monitor,
  Users,
  Home,
  Package,
  CreditCard,
  UserCheck,
  BarChart2,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  Bell,
  Menu,
  ChevronDown,
  HandCoins,
} from 'lucide-react'
import { useAuthLayout } from './AuthLayout'

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Orders',
    icon: ListOrdered,
    subItems: [
      { name: 'Orders', href: '/orders/orders' },
      { name: 'Returns', href: '/orders/returns' },
    ],
  },
  {
    name: 'Products',
    icon: Tag,
    subItems: [
      { name: 'Product Lists', href: '/products/lists' },
      { name: 'Categories', href: '/products/categories' },
      { name: 'Suppliers', href: '/products/suppliers' },
    ],
  },
  { name: 'POS', href: '/pos', icon: Monitor },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Shops', href: '/shops', icon: Home },
  { name: 'Warehouse', href: '/warehouse/dashboard', icon: Package,
    subItems: [ 
      // { name: 'Dashboard', href: '/warehouse/dashboard' },
      { name: 'Warehouses', href: '/warehouse/warehouses' },
      // { name: 'Purchase History', href: '/warehouse/purchase-history' },
    ],
  },
  // { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
  { name: 'Employees', href: '/employees', icon: UserCheck },
  {
    name: 'Finance',
    icon: HandCoins,
    subItems: [
      // {name: 'Treasury', href: '/reports/treasury'},
      { name: 'Income', href: '/reports/income' },
      { name: 'Expenses', href: '/reports/expenses' },
      { name: 'Financial Performance', href: '/reports/performance' },
      
    ],
  },
]

const settingsItems = [
  { name: 'Global Settings', href: '/settings', icon: Settings },
  { name: 'Help/Support', href: '/help', icon: HelpCircle },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = useAuthLayout()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({})
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [name]: !prev[name]
    }))
  }

  const handleNavigation = (href: string) => {
    // Use window.location for navigation in Electron
    window.location.href = href
  }

  const logoPath = business?.shopLogo 
    ? business.shopLogo
    : "/assets/images/logo.svg"
  
  const businessName = business?.fullBusinessName || "SalesBox"

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white text-gray-700 flex flex-col transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        )}
      >
        <div className="flex items-center h-16 px-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2"
          >
            <Menu className="h-6 w-6" />
          </Button>
          {sidebarOpen ? (
            <a href="/" onClick={(e) => { e.preventDefault(); handleNavigation('/dashboard'); }} className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Image 
                  src={logoPath} 
                  alt={`${businessName} Logo`} 
                  width={30} 
                  height={30}
                  className="object-contain"
                />
                <span className="text-lg font-bold">{businessName}</span>
              </div>
            </a>
          ) : (
            <Image 
              src={logoPath} 
              alt={`${businessName} Logo`} 
              width={30} 
              height={30} 
              className="mx-auto object-contain"
            />
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigationItems.map((item) => (
              <li key={item.name}>
                {item.subItems ? (
                  <div>
                    <button
                      onClick={() => toggleDropdown(item.name)}
                      className={cn(
                        "flex items-center justify-between w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        openDropdowns[item.name] ? "bg-gray-100" : "hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className={cn("h-5 w-5 flex-shrink-0", sidebarOpen ? "mr-3" : "mx-auto")} />
                        {sidebarOpen && <span>{item.name}</span>}
                      </div>
                      {sidebarOpen && <ChevronDown className={cn("h-4 w-4 transition-transform", openDropdowns[item.name] && "transform rotate-180")} />}
                    </button>
                    {openDropdowns[item.name] && sidebarOpen && (
                      <ul className="mt-2 space-y-1 px-3">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.name}>
                            <a
                              href={subItem.href}
                              className={cn(
                                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                pathname === subItem.href
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-700 hover:bg-gray-100"
                              )}
                              onClick={(e) => {
                                e.preventDefault()
                                handleNavigation(subItem.href)
                              }}
                            >
                              {subItem.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <a
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      handleNavigation(item.href)
                    }}
                  >
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", sidebarOpen ? "mr-3" : "mx-auto")} />
                    {sidebarOpen && <span>{item.name}</span>}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <h3 className={cn("px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider", !sidebarOpen && "text-center")}>
              {sidebarOpen ? "Settings" : "..."}
            </h3>
            <ul className="mt-3 space-y-1 px-3">
              {settingsItems.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      handleNavigation(item.href)
                    }}
                  >
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", sidebarOpen ? "mr-3" : "mx-auto")} />
                    {sidebarOpen && <span>{item.name}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        {!isMobile && (
          <div className="border-t p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="mx-auto"
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-5 w-5 text-gray-500" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 w-full md:w-[300px] bg-gray-100 border-none"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-blue-600 rounded-full"></span>
            </Button>
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-user.jpg" alt={user?.username || 'User'} />
                <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{user?.username || 'User'}</span>
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}