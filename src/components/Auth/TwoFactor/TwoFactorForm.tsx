/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'


import Image from "next/image"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { ArrowUpIcon, EyeIcon, ChevronDown} from "lucide-react"
import { useRouter } from 'next/navigation'
import Link from 'next/link'  

export function TwoStepVerificationComponent(): JSX.Element {
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically handle the login logic
    // For now, we'll just navigate to the dashboard
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
      <div className="flex-1 relative overflow-hidden p-4 lg:p-0">
        <div className="absolute top-4 left-4">
          <Image src="/assets/images/salesbox-logo.svg" alt="SalesBox Logo" width={120} height={40} />
        </div>
        <div className="hidden lg:block absolute top-20 right-10">
          <Card className="w-64">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-2">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex items-center">
                  <div className="text-2xl font-bold">8,458</div>
                  <div className="text-sm text-red-500 ml-2">▼ 3.10%</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-2">New Customers</div>
            </CardContent>
          </Card>
        </div>
        <div className="hidden lg:block absolute bottom-20 right-10">
        <Card className="w-[166px] h-[210px] shadow-lg rounded-lg">
            <CardContent className="p-4">
              <div className="flex flex-col mb-2">
                <div className="flex items-center  mr-2">
                  <svg width="41" height="40" viewBox="0 0 41 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.578857" width="40" height="40" rx="8" fill="#FF4D49" />
                    <rect x="0.578857" width="40" height="40" rx="8" fill="white" fill-opacity="0.88" />
                    <path d="M28.5789 14H26.3989C26.5089 13.69 26.5789 13.35 26.5789 13C26.5789 11.34 25.2389 10 23.5789 10C22.5289 10 21.6189 10.54 21.0789 11.35L20.5789 12.02L20.0789 11.34C19.5389 10.54 18.6289 10 17.5789 10C15.9189 10 14.5789 11.34 14.5789 13C14.5789 13.35 14.6489 13.69 14.7589 14H12.5789C11.4689 14 10.5889 14.89 10.5889 16L10.5789 27C10.5789 28.11 11.4689 29 12.5789 29H28.5789C29.6889 29 30.5789 28.11 30.5789 27V16C30.5789 14.89 29.6889 14 28.5789 14ZM23.5789 12C24.1289 12 24.5789 12.45 24.5789 13C24.5789 13.55 24.1289 14 23.5789 14C23.0289 14 22.5789 13.55 22.5789 13C22.5789 12.45 23.0289 12 23.5789 12ZM17.5789 12C18.1289 12 18.5789 12.45 18.5789 13C18.5789 13.55 18.1289 14 17.5789 14C17.0289 14 16.5789 13.55 16.5789 13C16.5789 12.45 17.0289 12 17.5789 12ZM28.5789 27H12.5789V25H28.5789V27ZM28.5789 22H12.5789V16H17.6589L15.5789 18.83L17.1989 20L20.5789 15.4L23.9589 20L25.5789 18.83L23.4989 16H28.5789V22Z" fill="#FF4D49" />
                  </svg>
                  <div className="text-sm text-red-500 flex items-center ml-8">-18% <ChevronDown className="w-4 h-4 ml-1" /></div>
                </div>
                <div className="flex flex-col gap-1 mb-4 mt-4">
                  <div className="text-2xl font-bold">$8.16k</div>
                  <span className="text-sm text-gray-500">Total Expenses</span>
                </div>
                <div className="text-sm text-gray-500 bg-gray-100 rounded-full px-2 py-1 text-center mb-4">Last One Year</div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Image
          src="/assets/images/two-step-image.svg"
          alt="3D Character"
          width={1000}
          height={800}
          className="hidden lg:block absolute bottom-0 right-0 max-w-full max-h-full object-contain mb-10 mr-0"
        />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 max-w-lg mx-auto bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2 flex items-center">
            Two Step Verification
            <span className="ml-2 text-muted-foreground">💬</span>
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            We sent a verification code to your mobile. Enter the code from the mobile in the field below.
            ******1234
          </p>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {[...Array(6)].map((_, i) => (
              <Input key={i} className="text-center" maxLength={1} />
            ))}
          </div>
          <Button className="w-full mb-4">SKIP FOR NOW</Button>
          <div className="text-center">
            <span className="text-sm text-gray-500">Didn&apos;t get the mail? </span>
            <a href="#" className="text-sm text-blue-500 hover:underline">Resend</a>
          </div>
        </div>
      </div>
    </div>
  )
}