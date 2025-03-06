'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ListOrdered,
  Tag,
  Monitor,
  Users,
  Home,
  Package,
  UserCheck,
  BarChart2,
  Settings,
  HelpCircle,
  ChevronDown,
  HandCoins,
  LogOut,
  Menu,
} from 'lucide-react'
import { useAuthLayout } from './AuthLayout'
import { Header } from './Header'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/Shared/ui/button"

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
  { name: 'Shops', href: '/shops', icon: Home, requiredRoles: ['Admin', 'shop_owner'] },
  {
    name: 'Inventory',
    icon: Package,
    requiredRoles: ['Admin', 'shop_owner'],
    subItems: [
      { name: 'Dashboard', href: '/inventory/dashboard' },
      { name: 'Warehouses', href: '/inventory/warehouses' },
    ],
  },
  { 
    name: 'Employees', 
    href: '/employees', 
    icon: UserCheck,
    requiredRoles: ['Admin', 'shop_owner']
  },
  {
    name: 'Finance',
    icon: HandCoins,
    requiredRoles: ['Admin', 'shop_owner'],
    subItems: [
      { name: 'Income', href: '/reports/income' },
      { name: 'Expenses', href: '/reports/expenses' },
      { name: 'Financial Reports', href: '/reports/performance' },
    ],
  }, 
]

const settingsItems = [
  { name: 'Global Settings', href: '/settings', icon: Settings },
  { 
    name: 'Help/Support', 
    href: 'https://wa.me/654933877', 
    icon: HelpCircle,
    external: true 
  },
]

// Logo component that handles collapsed state
function SidebarLogo() {
  const { state } = useSidebar();
  const { business } = useAuthLayout();
  const logoPath = business?.shopLogo || "/assets/images/logo.svg";
  const businessName = business?.fullBusinessName || "SalesBox";
  
  return (
    <div className="flex items-center h-16 px-4">
      <SidebarTrigger />
      <div className={cn(
        "flex items-center ml-2",
        state === "expanded" ? "space-x-2" : "justify-center"
      )}>
        <Image 
          src={logoPath} 
          alt={`${businessName} Logo`} 
          width={state === "expanded" ? 40 : 30} 
          height={state === "expanded" ? 40 : 30}
          className="object-contain"
        />
        {state === "expanded" && (
          <span className="text-lg font-bold">{businessName}</span>
        )}
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, business, logout } = useAuthLayout()
  const pathname = usePathname()
  const router = useRouter()
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>(() => {
    const initialDropdowns: { [key: string]: boolean } = {};
    navigationItems.forEach(item => {
      if (item.subItems) {
        const isActive = item.subItems.some(subItem => subItem.href === pathname);
        if (isActive) {
          initialDropdowns[item.name] = true;
        }
      }
    });
    return initialDropdowns;
  })
  const [activeItem, setActiveItem] = useState<string>(pathname)
  const [sidebarState, setSidebarState] = useState<boolean>(true)

  // Find which dropdown contains the current path
  const findParentDropdown = useCallback((path: string) => {
    for (const item of navigationItems) {
      if (item.subItems && item.subItems.some(subItem => subItem.href === path)) {
        return item.name;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    setActiveItem(pathname);
    
    // Keep dropdowns open when navigating to a page within that dropdown
    const parentDropdown = findParentDropdown(pathname);
    if (parentDropdown) {
      setOpenDropdowns(prev => ({ ...prev, [parentDropdown]: true }));
    }
  }, [pathname, findParentDropdown]);

  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.requiredRoles) {
      return item.requiredRoles.some(role => role === user?.role)
    }
    return true
  })

  const toggleDropdown = (name: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setOpenDropdowns((prev) => {
      const newState = { ...prev };
      // Toggle the clicked dropdown
      newState[name] = !prev[name];
      return newState;
    });
  }

  const handleNavigation = (href: string, parentDropdown?: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setActiveItem(href);
    
    // If this is a sub-item, ensure its parent dropdown stays open
    if (parentDropdown) {
      setOpenDropdowns((prev) => {
        return { ...prev, [parentDropdown]: true };
      });
    }
    
    // Use client-side navigation
    router.push(href);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider defaultOpen={true} open={sidebarState} onOpenChange={setSidebarState}>
        <div className="flex h-full w-full">
          <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="border-b">
              <SidebarLogo />
            </SidebarHeader>
            
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {filteredNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      {item.subItems ? (
                        <div>
                          <SidebarMenuButton 
                            onClick={(e) => toggleDropdown(item.name, e)}
                            isActive={openDropdowns[item.name] || item.subItems.some(subItem => subItem.href === activeItem)}
                            tooltip={item.name}
                          >
                            <item.icon className="h-5 w-5" />
                            <span>{item.name}</span>
                            <ChevronDown className={cn(
                              "ml-auto h-4 w-4 transition-transform",
                              openDropdowns[item.name] && "transform rotate-180"
                            )} />
                          </SidebarMenuButton>
                          
                          {openDropdowns[item.name] && (
                            <div className="mt-1 ml-6 space-y-1">
                              {item.subItems.map((subItem) => (
                                <SidebarMenuButton
                                  key={subItem.name}
                                  isActive={activeItem === subItem.href}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigation(subItem.href, item.name, e);
                                  }}
                                  tooltip={subItem.name}
                                >
                                  <span>{subItem.name}</span>
                                </SidebarMenuButton>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <SidebarMenuButton
                          isActive={activeItem === item.href}
                          onClick={(e) => handleNavigation(item.href, undefined, e)}
                          tooltip={item.name}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
              
              <SidebarGroup>
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {settingsItems.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          onClick={(e) => {
                            if (item.external) {
                              window.open(item.href, '_blank');
                            } else {
                              handleNavigation(item.href, undefined, e);
                            }
                          }}
                          tooltip={item.name}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            
            <SidebarFooter className="border-t">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={logout}
                    tooltip="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header user={user} />
            
            <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}