import Image from "next/image"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ArrowUpIcon, ChartNoAxesColumnIcon } from "lucide-react"

export function VerifyEmail() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 relative overflow-hidden p-8">
        <div className="absolute top-4 left-4">
          <Image src="/assets/images/salesbox-logo.svg" alt="SalesBox Logo" width={120} height={40} />
        </div>
        <div className="hidden lg:block absolute top-20 left-40">
          <Card className="p-2">
            <CardHeader className="p-4">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                42.5k XAF <span className="text-red-500 text-sm">-22%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <div className="mt-2 flex space-x-2">
                <svg width="122" height="93" viewBox="0 0 122 93" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.75 55.5078C8.75 53.2987 10.5409 51.5078 12.75 51.5078C14.9591 51.5078 16.75 53.2987 16.75 55.5078V93.0001H8.75V55.5078Z" fill="#FDB528" />
                  <path d="M0.916504 43C0.916504 40.7909 2.70736 39 4.9165 39C7.12564 39 8.9165 40.7909 8.9165 43V93H0.916504V43Z" fill="#1A7DC0" />
                  <path d="M43.75 42.6309C43.75 40.4217 45.5409 38.6309 47.75 38.6309C49.9591 38.6309 51.75 40.4217 51.75 42.6309V93.0001H43.75V42.6309Z" fill="#FDB528" />
                  <path d="M35.75 4C35.75 1.79086 37.5409 0 39.75 0C41.9591 0 43.75 1.79086 43.75 4V93H35.75V4Z" fill="#1A7DC0" />
                  <path d="M78.75 75.5381C78.75 73.3289 80.5409 71.5381 82.75 71.5381C84.9591 71.5381 86.75 73.3289 86.75 75.5381V92.9996H78.75V75.5381Z" fill="#FDB528" />
                  <path d="M70.75 28.3227C70.75 26.1136 72.5409 24.3228 74.75 24.3228C76.9591 24.3228 78.75 26.1136 78.75 28.3228V92.9996H70.75V28.3227Z" fill="#1A7DC0" />
                  <path d="M113.75 65.5234C113.75 63.3143 115.541 61.5234 117.75 61.5234C119.959 61.5234 121.75 63.3143 121.75 65.5234V93.0003H113.75V65.5234Z" fill="#FDB528" />
                  <path d="M105.75 42.6309C105.75 40.4217 107.541 38.6309 109.75 38.6309C111.959 38.6309 113.75 40.4217 113.75 42.6309V93.0001H105.75V42.6309Z" fill="#1A7DC0" />
                </svg>
              </div>
            </CardContent>
          </Card>
          </div>
          <div className="hidden lg:block absolute top-20 right-10">
          <Card className="p-2">
            <CardHeader className="p-4">
              <CardTitle className="text-lg font-bold">Sales This Month</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Sales This Month</p>
              <p className="text-xl font-bold mt-1">28,450 XAF</p>
              <div className="mt-2 flex space-x-2">
                <svg width="241" height="109" viewBox="0 0 241 109" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g filter="url(#filter0_d_1408_8449)">
                    <path d="M228 3H200.113L188 35.4686H158.302L149.318 83H112.584L103.408 52.5398H83.0392L68.9989 30.7284H44.878L32.7908 55.1636H13" stroke="#1A7DC0" strokeWidth="5" strokeLinecap="round" />
                  </g>
                  <defs>
                    <filter id="filter0_d_1408_8449" x="0.5" y="0.5" width="240" height="109" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                      <feOffset dy="14" />
                      <feGaussianBlur stdDeviation="5" />
                      <feComposite in2="hardAlpha" operator="out" />
                      <feColorMatrix type="matrix" values="0 0 0 0 0.4 0 0 0 0 0.423529 0 0 0 0 1 0 0 0 0.21 0" />
                      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1408_8449" />
                      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1408_8449" result="shape" />
                    </filter>
                  </defs>
                </svg>
              </div>
            </CardContent>
          </Card>
          </div>
          <div className="hidden lg:block absolute bottom-20 right-10">          
            <Card className="mt-4">
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
          src="/assets/images/verify-image.svg"
          alt="3D Character"
          width={1000}
          height={800}
          className="hidden lg:block absolute bottom-0 right-0 max-w-full max-h-full object-contain mb-10 mr-0"
        />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 max-w-lg mx-auto bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-4">
            Verify your email
          </h1>
          <p className="text-gray-600 mb-6">
            Account activation link sent to your email address: john.doe@email.com
            Please follow the link inside to continue.
          </p>
          <Button className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white uppercase">Skip for now</Button>
          <p className="text-sm text-center">
            Didn&apos;t get the mail? <a href="#" className="text-blue-500 hover:underline">Resend</a>
          </p>
        </div>
      </div>
    </div>
  )
}