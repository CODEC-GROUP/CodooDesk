'use client'

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { ArrowUpIcon, EyeIcon, LockIcon, ChevronRight, ChartNoAxesColumnIcon } from "lucide-react"
import { useState } from 'react';

export function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 relative overflow-hidden p-8 hidden sm:block">
        <div className="absolute top-4 left-4">
          <Image src="/assets/images/salesbox-logo.svg" alt="SalesBox Logo" width={120} height={40} />
        </div>
        <div className="hidden lg:block absolute top-60 left-60">
          <Card className="w-[168.67px] h-auto bg-white rounded-[10px] shadow-[0_2px_10px_rgba(76,78,100,0.22)]">
            <CardContent className="p-6">
              <div className="text-2xl font-bold mb-2">$42.5k</div>
              <div className="text-sm text-green-500">+42%</div>
              <div className="text-sm text-gray-500 mb-4">Overview</div>
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-blue-500 rounded-full"></div>
                </div>
                <div className="absolute top-0 left-0 w-16 h-16 bg-green-500 rounded-full"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 bg-green-300 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-blue-300 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
              </div>
            </CardContent>
          </Card>
          </div>
          <div className="hidden lg:block absolute bottom-20 right-10">
          <Card className="w-[280px] h-auto bg-white shadow-[0_2px_10px_rgba(76,78,100,0.22)] rounded-[10px]">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: '10px',
                  padding: '9px',
                  gap: '10px',
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.88)), #FDB528',
                  borderRadius: '8px',
                  flex: 'none',
                  order: 0,
                  flexGrow: 0
                }}>
                  <ChartNoAxesColumnIcon color="orange"/>
                </div>
                <div className="text-2xl font-bold">28. XAF</div>
                <ArrowUpIcon className="w-4 h-4 text-green-500 ml-2" />
                <span className="text-sm text-green-500 ml-1">18.2%</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">Total Profit</div>
            </CardContent>
          </Card>
          </div>
        <Image
          src="/assets/images/reset-image.svg"
          alt="3D Character"
          width={1000}
          height={800}
          className="hidden lg:block absolute bottom-0 right-0 max-w-full max-h-full object-contain mb-10 mr-0"
        />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 max-w-lg mx-auto bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8 sm:hidden">
            <Image src="/assets/images/salesbox-logo.svg" alt="SalesBox Logo" width={120} height={40} />
          </div>
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            Reset Password <LockIcon className="ml-2 w-6 h-6" />
          </h1>
          <p className="text-gray-500 mb-8">
            Your new password must be different from previously used passwords
          </p>
          <form className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input id="new-password" type={showPassword ? "text" : "password"} placeholder="New Password" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input id="confirm-password" type={showPassword ? "text" : "password"} placeholder="Confirm Password" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <Button className="w-full">LOGIN</Button>
          </form>
          <div className="mt-6">
            <Link href="/login" className="text-blue-500 hover:underline flex items-center">
              <ChevronRight className="w-4 h-4 mr-2 transform rotate-180" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}