import type { Metadata } from "next"
import localFont from "next/font/local"
import AuthLayout from "@/components/Shared/Layout/AuthLayout"
import { Toaster } from "@/components/Shared/ui/toaster"
import "./globals.css"
import { LanguageProvider } from '@/providers/LanguageProvider'
import { ClientQueryProvider } from "@/components/ClientQueryProvider"

// Font configurations
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: 'swap', // Optimize font loading
})

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: 'swap',
})

// Metadata configuration
export const metadata: Metadata = {
  title: "SalesBox - Smart Point of Sale System",
  description: "A modern, efficient point of sale system for managing your business operations, inventory, and sales with ease.",
  keywords: "SalesBox, POS, point of sale, inventory management, sales management, business operations, retail management",
  authors: [{ name: "SalesBox Team" }],
  creator: "SalesBox",
  publisher: "SalesBox",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}>
        <LanguageProvider>
          <ClientQueryProvider>
            <AuthLayout>
              {children}
              <Toaster />
            </AuthLayout>
          </ClientQueryProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
