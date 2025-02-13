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
      const isAuth = localStorage.getItem('isAuthenticated')

      // If not authenticated, go to login
      if (!isAuth || !storedUser) {
        router.push('/auth/login')
        return
      }

      // If authenticated but no business, go to account setup
      if (storedUser && !storedBusiness) {
        router.push('/account-setup')
        return
      }

      // If both user and business exist, go to dashboard
      if (storedUser && storedBusiness) {
        router.push('/dashboard')
      }
    }

    checkAuthAndSetup()
  }, [router, isAuthenticated, user, business])

  // Return Login component as the default
  return <Login />
}