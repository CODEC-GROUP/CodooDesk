'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Login } from '@/components/Auth/Login/LoginForm'
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user, business } = useAuthLayout()

  useEffect(() => {
    const checkAuthAndSetup = async () => {
      const storedUser = localStorage.getItem('user')
      const storedBusiness = localStorage.getItem('business')

      // If no user in localStorage, go to login
      if (!storedUser) {
        router.push('/auth/login')
        return
      }

      // If user exists in localStorage but no business, go to account setup
      if (storedUser && !storedBusiness) {
        router.push('/account-setup')
        return
      }

      // If both user and business exist in localStorage, go to dashboard
      if (storedUser && storedBusiness) {
        router.push('/dashboard')
      }
    }

    checkAuthAndSetup()
  }, [router, isAuthenticated, user, business])

  // Return Login component as the default
  return <Login />
}