'use client'

import Image from "next/image"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { ArrowUpIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { useRouter } from 'next/navigation'
import Link from 'next/link'  
import { useState } from 'react';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'

export function Login() {
  const { login, checkSetupStatus } = useAuthLayout()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const result = await login(email, password)
      if (result.success) {
        const hasSetup = await checkSetupStatus()
        if (hasSetup) {
          router.push('/dashboard')
        } else {
          router.push('/account-setup')
        }
      } else {
        setError(result.message ?? 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('An error occurred during login')
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
      <div className="flex-1 relative overflow-hidden p-4 lg:p-0">
        <div className="absolute top-4 left-4">
          <Image src="/assets/images/salesbox-logo.svg" alt="SalesBox Logo" width={120} height={40} />
        </div>
        <div className="hidden lg:block absolute top-20 left-10">
          <Card className="w-64">
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold flex items-center">
                100K XAF
                <ArrowUpIcon className="w-4 h-4 text-green-500 ml-2" />
                <svg width="57" height="56" viewBox="0 0 57 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="28.1456" cy="28" r="28" fill="#ECF2FF"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M28.1456 19C28.6979 19 29.1456 19.4477 29.1456 20L29.1464 20.0903C31.3393 20.4914 33.035 22.1853 33.1404 24.2915L33.1456 24.5H31.1456C31.1456 23.4338 30.3235 22.491 29.147 22.1428L29.1464 27.0903C31.4112 27.5046 33.1456 29.2978 33.1456 31.5C33.1456 33.7022 31.4112 35.4954 29.1464 35.9097L29.1456 36C29.1456 36.5523 28.6979 37 28.1456 37C27.5933 37 27.1456 36.5523 27.1456 36L27.1458 35.9099C24.9525 35.5091 23.2563 33.815 23.1508 31.7085L23.1456 31.5H25.1456C25.1456 32.5665 25.9682 33.5095 27.1452 33.8575L27.1458 28.9099C24.8806 28.4959 23.1456 26.7025 23.1456 24.5C23.1456 22.2975 24.8806 20.5041 27.1458 20.0901L27.1456 20C27.1456 19.4477 27.5933 19 28.1456 19ZM29.1469 29.1428L29.147 33.8572C30.3235 33.509 31.1456 32.5662 31.1456 31.5C31.1456 30.4337 30.3234 29.491 29.1469 29.1428ZM25.1456 24.5C25.1456 25.5666 25.9683 26.5096 27.1454 26.8575L27.1452 22.1425C25.9682 22.4905 25.1456 23.4335 25.1456 24.5Z" fill="#1A7DC0"/>
                </svg>
              </div>
            </CardContent>
          </Card>
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
          <Card className="w-50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold flex items-center">
                42.5k XAF
                <span className="text-sm text-green-500 ml-2">+62%</span>
              </div>
              <div className="text-sm text-gray-500">Sessions</div>
              <div className="mt-2">
                <svg width="129" height="93" viewBox="0 0 129 93" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="2.63391" y1="2.18557e-08" x2="2.63391" y2="93" stroke="#4C4E64" stroke-opacity="0.12" stroke-dasharray="6 6"/>
                  <line x1="26.4606" y1="2.17903e-08" x2="26.4606" y2="93" stroke="#4C4E64" stroke-opacity="0.12" stroke-dasharray="6 6"/>
                  <line x1="50.2872" y1="2.17903e-08" x2="50.2872" y2="93" stroke="#4C4E64" stroke-opacity="0.12" stroke-dasharray="6 6"/>
                  <line x1="74.1139" y1="2.17903e-08" x2="74.1139" y2="93" stroke="#4C4E64" stroke-opacity="0.12" stroke-dasharray="6 6"/>
                  <line x1="97.9406" y1="2.17903e-08" x2="97.9405" y2="93" stroke="#4C4E64" stroke-opacity="0.12" stroke-dasharray="6 6"/>
                  <line x1="121.767" y1="2.17903e-08" x2="121.767" y2="93" stroke="#4C4E64" stroke-opacity="0.12" stroke-dasharray="6 6"/>
                  <path d="M2.13391 90.9431L26.4188 55.4935L50.2454 83.2169L75.4466 36.8597L98.3569 64.5831L121.725 8.22729" stroke="#26C6F9" stroke-width="3" stroke-linecap="round"/>
                  <circle cx="121.368" cy="10" r="5.5" fill="white" stroke="#26C6F9" stroke-width="3"/>
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>
        <Image
          src="/assets/images/login-image.svg"
          alt="3D Character"
          width={1000}
          height={800}
          className="hidden lg:block absolute bottom-0 right-0 max-w-full max-h-full object-contain mb-10 mr-0"
        />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 max-w-lg mx-auto bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Welcome to SaleBox! 👋</h1>
          <p className="text-gray-500 mb-8">Please sign-in to your account and start the adventure</p>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email" 
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" 
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <label htmlFor="remember" className="text-sm text-gray-500">Remember Me</label>
              </div>
              {/* <a href="#" className="text-sm text-blue-500 hover:underline">Forgot Password?</a> */}
            </div>
            <Button className="w-full" type="submit">LOGIN</Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              New on our platform? <Link href="/auth/register" className="text-blue-500 hover:underline">Create an account</Link>
            </p>
          </div>
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
          </div>
          {/* <Button variant="outline" className="w-full mt-4">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Continue with Google
          </Button> */}
        </div>
      </div>
    </div>
  )
}