'use client'

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { LockIcon, TrendingUpIcon, ChevronDown, ChevronUp, ChevronRight } from "lucide-react"

export function ForgotPassword() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden p-8">
        <div className="absolute top-4 left-4">
          <Image src="/assets/images/salesbox-logo.svg" alt="SalesBox Logo" width={120} height={40} />
        </div>
        <div className="hidden lg:block absolute top-40 left-60">
          <Card className="w-[200px] h-[210px]" >
            <CardContent className="p-6">
              <div className="flex items-center mb-2">
                <svg width="40" height="41" viewBox="0 0 40 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect y="0.826172" width="40" height="40" rx="8" fill="#72E128" />
                  <rect y="0.826172" width="40" height="40" rx="8" fill="white" fill-opacity="0.88" />
                  <path d="M19.8001 19.7262C17.5301 19.1362 16.8001 18.5262 16.8001 17.5762C16.8001 16.4862 17.8101 15.7262 19.5001 15.7262C21.2801 15.7262 21.9401 16.5762 22.0001 17.8262H24.2101C24.1401 16.1062 23.0901 14.5262 21.0001 14.0162V11.8262H18.0001V13.9862C16.0601 14.4062 14.5001 15.6662 14.5001 17.5962C14.5001 19.9062 16.4101 21.0562 19.2001 21.7262C21.7001 22.3262 22.2001 23.2062 22.2001 24.1362C22.2001 24.8262 21.7101 25.9262 19.5001 25.9262C17.4401 25.9262 16.6301 25.0062 16.5201 23.8262H14.3201C14.4401 26.0162 16.0801 27.2462 18.0001 27.6562V29.8262H21.0001V27.6762C22.9501 27.3062 24.5001 26.1762 24.5001 24.1262C24.5001 21.2862 22.0701 20.3162 19.8001 19.7262Z" fill="#72E128" />
                  <path d="M19.8001 19.7262C17.5301 19.1362 16.8001 18.5262 16.8001 17.5762C16.8001 16.4862 17.8101 15.7262 19.5001 15.7262C21.2801 15.7262 21.9401 16.5762 22.0001 17.8262H24.2101C24.1401 16.1062 23.0901 14.5262 21.0001 14.0162V11.8262H18.0001V13.9862C16.0601 14.4062 14.5001 15.6662 14.5001 17.5962C14.5001 19.9062 16.4101 21.0562 19.2001 21.7262C21.7001 22.3262 22.2001 23.2062 22.2001 24.1362C22.2001 24.8262 21.7101 25.9262 19.5001 25.9262C17.4401 25.9262 16.6301 25.0062 16.5201 23.8262H14.3201C14.4401 26.0162 16.0801 27.2462 18.0001 27.6562V29.8262H21.0001V27.6762C22.9501 27.3062 24.5001 26.1762 24.5001 24.1262C24.5001 21.2862 22.0701 20.3162 19.8001 19.7262Z" fill="black" fill-opacity="0.1" />
                </svg>
                <div className="flex items-center text-sm text-[#72E128] mb-1">+38% <ChevronUp className="w-4 h-4 ml-1" /></div>
              </div>
              <div className="gap-2 mb-4 mt-4">
                <div className="text-2xl font-bold">$13.4k</div>
                <div className="text-sm text-gray-500">Total Sales</div>
              </div>
              <div className="text-sm text-gray-500 bg-gray-100 rounded-full px-2 py-1 text-center mb-4">Last Six Months</div>
            </CardContent>
          </Card>
        </div>
        <div className="hidden lg:block absolute top-20 right-10">
          <Card className="w-[265px] h-[85px]">
            <CardContent className="p-6">
              <div className="flex items-center mb-2">
                <div className="w-[40px] h-[40px] rounded-md bg-blue-100 flex items-center justify-center mr-4">
                  <TrendingUpIcon className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="flex items-center text-2xl font-bold">2,450k <span className="flex items-center text-sm text-red-500 mb-1"><ChevronDown className="w-4 h-4 ml-1" /> -24.6%</span></div>
                  <div className="text-sm text-gray-500">New Transactions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="hidden lg:block absolute bottom-20 right-10">
          <Card className="w-[168px] h-[210px]" >
            <CardContent className="p-6">
              <div className="flex items-center mb-2">
                <div className="text-2xl font-bold">$42.5k</div>
                <span className="text-sm text-amber-500 ml-2">+38%</span>
              </div>
              <div className="text-sm text-gray-500 mb-4">Total Sales</div>
              <svg width="135" height="97" viewBox="0 0 135 97" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.3335 95C6.08036 85.4098 17.9118 55.3988 30.1906 76.9609C51.6944 114.722 56.2558 60.3025 60.9801 45.3179C65.8673 28.2355 71.1455 29.7933 82.4839 50.652C96.6568 76.7253 103.01 65.9364 107.409 37.1659C111.807 8.39535 115.717 -10.1921 132.333 11.3857" stroke="#FDB528" stroke-width="4" stroke-linecap="round" />
              </svg>
            </CardContent>
          </Card>
        </div>
        <Image
          src="/assets/images/forgot-image.svg"
          alt="3D Character"
          width={1000}
          height={800}
          className="hidden lg:block absolute bottom-0 right-0 max-w-full max-h-full object-contain mb-10 mr-0"
        />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 max-w-lg mx-auto bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center">
            Forgot Password <LockIcon className="ml-2 w-5 h-5 sm:w-6 sm:h-6" />
          </h1>
          <p className="text-gray-500 mb-6 sm:mb-8">
            Enter your email and we&lsquo;ll send you instructions to reset your password
          </p>
          <form className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <Button className="w-full">SEND RESET LINK</Button>
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