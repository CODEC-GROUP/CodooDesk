'use client'

import Image from "next/image"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { ChevronUp, EyeIcon, EyeOffIcon } from "lucide-react"
import Link from 'next/link'
import { useState } from 'react';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'
import { useRouter } from 'next/navigation'

export function Register() {
  const { register } = useAuthLayout()
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    acceptTerms: false,
    role: 'shop_owner' as const
  })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.acceptTerms) {
      setError('Please accept the terms and conditions')
      return
    }
    setError('')

    try {
      const result = await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      })

      if (result.success) {
        // After successful registration, redirect to account setup
        router.push('/account-setup')
      } else {
        setError(result.message || 'Registration failed')
      }
    } catch (err: any) {
      const errorMessage = err.message || err.toString()
      setError(`Registration error: ${errorMessage}`)
      console.error('Registration failed:', {
        error: errorMessage,
        details: err
      })
    }
  }

  const togglePasswordVisibility = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent form submission
    setShowPassword(!showPassword)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 relative overflow-hidden p-8">
        <div className="absolute top-4 left-4">
          <Image src="/assets/images/salesbox-logo.svg" alt="SalesBox Logo" width={120} height={40} />
        </div>
        <div className="grid grid-cols-2 gap-8 mt-8">
          <Card className="w-[168px] h-[201px]" style={{ position: 'absolute', left: '30px', top: '100px' }}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1 mb-4">
                <div className="text-2xl font-bold">24.6k <span className="text-sm text-green-500">+38%</span></div>
                <span className="text-sm text-gray-500">Total Growth</span>
              </div>
              <div className="flex justify-center mb-4">
                <svg width="94" height="93" viewBox="0 0 94 93" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.0411 50.3742C3.06938 39.6828 6.15085 29.0166 12.6745 20.4907C19.1981 11.9647 28.6875 6.20159 39.261 4.34405L40.8903 13.6184C32.643 15.0672 25.2413 19.5625 20.1528 26.2127C15.0644 32.863 12.6608 41.1826 13.4188 49.5218L4.0411 50.3742Z" fill="#6D788D" />
                  <path d="M71.9298 81.0508C66.2167 85.2281 59.5568 87.9236 52.5464 88.8958C45.5361 89.868 38.394 89.0866 31.7597 86.6216C25.1254 84.1566 19.2058 80.085 14.5311 74.7711C9.85629 69.4573 6.57216 63.0672 4.97271 56.1728L14.1454 54.0448C15.393 59.4224 17.9546 64.4067 21.601 68.5515C25.2473 72.6963 29.8645 75.8722 35.0393 77.7949C40.2141 79.7175 45.7849 80.327 51.2529 79.5687C56.721 78.8104 61.9157 76.7079 66.372 73.4496L71.9298 81.0508Z" fill="#72E128" />
                  <path d="M45.7413 3.70848C54.2047 3.52542 62.5323 5.85614 69.671 10.4059C76.8098 14.9557 82.439 21.5202 85.8469 29.2693C89.2548 37.0183 90.2883 45.604 88.8168 53.9404C87.3452 62.2769 83.4346 69.9897 77.5796 76.1037L70.7788 69.5909C75.3457 64.822 78.396 58.8059 79.5438 52.3035C80.6916 45.8011 79.8855 39.1043 77.2273 33.06C74.5691 27.0157 70.1783 21.8955 64.6101 18.3466C59.0419 14.7978 52.5464 12.9798 45.945 13.1226L45.7413 3.70848Z" fill="#1A7DC0" />
                  <path d="M36.7672 40.3636V52H34.6592V42.4148H34.591L31.8694 44.1534V42.2216L34.7615 40.3636H36.7672ZM39.8717 52V50.4773L43.9115 46.517C44.2978 46.1269 44.6198 45.7803 44.8774 45.4773C45.135 45.1742 45.3282 44.8807 45.4569 44.5966C45.5857 44.3125 45.6501 44.0095 45.6501 43.6875C45.6501 43.3201 45.5668 43.0057 45.4001 42.7443C45.2335 42.4792 45.0043 42.2746 44.7126 42.1307C44.421 41.9867 44.0895 41.9148 43.7183 41.9148C43.3357 41.9148 43.0005 41.9943 42.7126 42.1534C42.4247 42.3087 42.2013 42.5303 42.0422 42.8182C41.8869 43.1061 41.8092 43.4489 41.8092 43.8466H39.8035C39.8035 43.108 39.9721 42.4659 40.3092 41.9205C40.6463 41.375 41.1103 40.9527 41.7013 40.6534C42.296 40.3542 42.9778 40.2045 43.7467 40.2045C44.527 40.2045 45.2126 40.3504 45.8035 40.642C46.3944 40.9337 46.8528 41.3333 47.1785 41.8409C47.5081 42.3485 47.6729 42.928 47.6729 43.5795C47.6729 44.0152 47.5895 44.4432 47.4229 44.8636C47.2562 45.2841 46.9626 45.75 46.5422 46.2614C46.1255 46.7727 45.5403 47.392 44.7865 48.1193L42.7808 50.1591V50.2386H47.849V52H39.8717ZM56.1808 49.8182V49.2045C56.1808 48.7538 56.2755 48.339 56.4649 47.9602C56.6581 47.5814 56.9384 47.2765 57.3058 47.0455C57.6732 46.8144 58.1183 46.6989 58.641 46.6989C59.1789 46.6989 59.6297 46.8144 59.9933 47.0455C60.3569 47.2727 60.6316 47.5758 60.8172 47.9545C61.0066 48.3333 61.1013 48.75 61.1013 49.2045V49.8182C61.1013 50.2689 61.0066 50.6837 60.8172 51.0625C60.6278 51.4413 60.3494 51.7462 59.9819 51.9773C59.6183 52.2083 59.1713 52.3239 58.641 52.3239C58.1107 52.3239 57.6619 52.2083 57.2944 51.9773C56.927 51.7462 56.6486 51.4413 56.4592 51.0625C56.2736 50.6837 56.1808 50.2689 56.1808 49.8182ZM57.6638 49.2045V49.8182C57.6638 50.1174 57.7357 50.392 57.8797 50.642C58.0236 50.892 58.2774 51.017 58.641 51.017C59.0085 51.017 59.2603 50.8939 59.3967 50.6477C59.5369 50.3977 59.6069 50.1212 59.6069 49.8182V49.2045C59.6069 48.9015 59.5407 48.625 59.4081 48.375C59.2755 48.1212 59.0198 47.9943 58.641 47.9943C58.285 47.9943 58.0331 48.1212 57.8853 48.375C57.7376 48.625 57.6638 48.9015 57.6638 49.2045ZM50.266 43.1591V42.5455C50.266 42.0909 50.3626 41.6742 50.5558 41.2955C50.749 40.9167 51.0293 40.6136 51.3967 40.3864C51.7641 40.1553 52.2092 40.0398 52.7319 40.0398C53.266 40.0398 53.7149 40.1553 54.0785 40.3864C54.446 40.6136 54.7225 40.9167 54.9081 41.2955C55.0937 41.6742 55.1865 42.0909 55.1865 42.5455V43.1591C55.1865 43.6136 55.0918 44.0303 54.9024 44.4091C54.7168 44.7841 54.4403 45.0852 54.0728 45.3125C53.7054 45.5398 53.2585 45.6534 52.7319 45.6534C52.1978 45.6534 51.7471 45.5398 51.3797 45.3125C51.016 45.0852 50.7395 44.7822 50.5501 44.4034C50.3607 44.0246 50.266 43.6098 50.266 43.1591ZM51.7603 42.5455V43.1591C51.7603 43.4621 51.8304 43.7386 51.9706 43.9886C52.1145 44.2348 52.3683 44.358 52.7319 44.358C53.0956 44.358 53.3456 44.2348 53.4819 43.9886C53.6221 43.7386 53.6922 43.4621 53.6922 43.1591V42.5455C53.6922 42.2424 53.6259 41.9659 53.4933 41.7159C53.3607 41.4621 53.1069 41.3352 52.7319 41.3352C52.3721 41.3352 52.1202 41.4621 51.9763 41.7159C51.8323 41.9697 51.7603 42.2462 51.7603 42.5455ZM50.9138 52L58.9138 40.3636H60.3342L52.3342 52H50.9138Z" fill="#4C4E64" fill-opacity="0.6" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8">
          <Card className="w-[262px] h-[80px]" style={{ position: 'absolute', left: '635px', top: '606px' }}>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="mr-4">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.000244141" width="40" height="40" rx="8" fill="#72E128" />
                    <rect x="0.000244141" width="40" height="40" rx="8" fill="white" fill-opacity="0.88" />
                    <path d="M19.8003 18.9C17.5303 18.31 16.8003 17.7 16.8003 16.75C16.8003 15.66 17.8103 14.9 19.5003 14.9C21.2803 14.9 21.9403 15.75 22.0003 17H24.2103C24.1403 15.28 23.0903 13.7 21.0003 13.19V11H18.0003V13.16C16.0603 13.58 14.5003 14.84 14.5003 16.77C14.5003 19.08 16.4103 20.23 19.2003 20.9C21.7003 21.5 22.2003 22.38 22.2003 23.31C22.2003 24 21.7103 25.1 19.5003 25.1C17.4403 25.1 16.6303 24.18 16.5203 23H14.3203C14.4403 25.19 16.0803 26.42 18.0003 26.83V29H21.0003V26.85C22.9503 26.48 24.5003 25.35 24.5003 23.3C24.5003 20.46 22.0703 19.49 19.8003 18.9Z" fill="#72E128" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">$48.2k</span>
                    <ChevronUp className="w-4 h-4 text-green-500 ml-2" />
                    <span className="text-sm text-green-500 ml-1">22.5%</span>
                  </div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Image
          src="/assets/images/register.svg"
          alt="3D Character"
          width={2000}
          height={2000}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mx-10 my-10"
        />
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2">Adventure starts here 🚀</h1>
          <p className="text-gray-500 mb-8">Make your app management easy and fun!</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Username" 
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email" 
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password" 
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={formData.acceptTerms}
                onCheckedChange={(checked: boolean) => 
                  setFormData(prev => ({ ...prev, acceptTerms: checked === true }))
                }
              />
              <label htmlFor="terms" className="text-sm text-gray-500">
                I Agree to privacy policy &amp; terms
              </label>
            </div>
            
            {error && <div className="text-red-500 text-sm">{error}</div>}
            
            <Button type="submit" className="w-full">
              REGISTER
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-500 hover:underline">
                Sign in instead
              </Link>
            </p>
          </div>
          {/* <div className="mt-4 text-center text-sm text-gray-500">or</div> */}
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