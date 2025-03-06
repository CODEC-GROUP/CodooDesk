import React from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/Shared/ui/avatar"
import { Search, Bell, ChevronRight } from 'lucide-react'

interface HeaderProps {
  user?: {
    username?: string;
    role?: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  return (
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
            <AvatarImage src="/assets/images/male.png" alt={user?.username || 'User'} />
            <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user?.username || 'User'}</span>
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </div>
      </div>
    </header>
  )
} 