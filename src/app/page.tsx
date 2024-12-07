'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AccountSetup from '@/components/Setup/AccountSetup'
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, checkSetupStatus, user } = useAuthLayout()

  useEffect(() => {
    const checkAuthAndSetup = async () => {
      try {
        if (!isAuthenticated || !user) {
          router.push('/auth/login')
          return
        }

        const hasSetup = await checkSetupStatus()
        if (hasSetup) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Failed to check setup status:', error)
      }
    }

    checkAuthAndSetup()
  }, [router, checkSetupStatus, isAuthenticated, user])

  // Show setup page only if authenticated and setup not complete
  // Otherwise, the useEffect will handle redirection
  return <AccountSetup />
}