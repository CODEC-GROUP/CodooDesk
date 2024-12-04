'use client'

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Business {
  id: string;
  fullBusinessName: string;
  shopLogo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  businessType: string;
  numberOfEmployees?: number;
  taxIdNumber?: string;
  shops?: Array<any>;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  business?: Business;
  message?: string;
  shopId?: string;
  isSetupComplete?: boolean;
}

interface LogoutResponse {
  success: boolean;
  message?: string;
}

interface BusinessResponse {
  success: boolean;
  business?: Business;
  message?: string;
}

interface SetupResponse {
  success: boolean;
  message?: string;
  business?: Business;
  shop?: any;
  location?: any;
  isSetupComplete?: boolean;
}

interface UpdateUserResponse {
  success: boolean;
  user?: User;
  message?: string;
}

interface AuthLayoutContextType {
  isAuthenticated: boolean;
  user: User | null;
  business: Business | null;
  setupAccount: (setupData: {
    businessData: any;
    locationData: any;
    shopData: any;
    userId?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  checkSetupStatus: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User; business?: Business }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  register: (userData: { username: string; email: string; password: string }) => Promise<{ success: boolean; message?: string; user?: User; business?: Business }>;
  checkAuth: () => Promise<void>;
  fetchBusiness: () => Promise<Business | undefined | void>;
}

export const AuthLayoutContext = createContext<AuthLayoutContextType | undefined>(undefined);

export const useAuthLayout = () => {
  const context = useContext(AuthLayoutContext);
  if (context === undefined) {
    throw new Error('useAuthLayout must be used within an AuthLayoutProvider');
  }
  return context;
};

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    try {
      const response = await safeIpcInvoke<AuthResponse>('auth:login', {
        email,
        password
      }, { success: false });

      if (response?.success && response.user) {
        setIsAuthenticated(true);
        setUser(response.user);
        setBusiness(response.business || null);
        
        localStorage.setItem('user', JSON.stringify(response.user));
        if (response.business) {
          localStorage.setItem('business', JSON.stringify(response.business));
        }
        if (response.shopId) {
          localStorage.setItem('currentShopId', response.shopId);
        }
        console.log(business)
        toast({
          title: "Success",
          description: "Logged in successfully",
        });

        setTimeout(() => {
          if (!response.isSetupComplete && response?.user?.role === 'shop_owner') {
            router.push('/account-setup');
          } else {
            router.push('/dashboard');
          }
        }, 100);

        return { success: true, user: response.user, business: response.business };
      }
      
      toast({
        title: "Error",
        description: response?.message || 'Login failed',
        variant: "destructive",
      });
      return { success: false, message: response?.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: 'Login failed',
        variant: "destructive",
      });
      return { success: false, message: 'Login failed' };
    }
  };

  const handleLogout = async () => {
    try {
      const response = await safeIpcInvoke<LogoutResponse>('auth:logout', {}, { 
        success: false 
      });

      if (response?.success) {
        setUser(null);
        setBusiness(null);
        setIsAuthenticated(false);
        localStorage.removeItem('currentShopId');
        router.push('/auth/login');
        toast({
          title: "Success",
          description: "Logged out successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to logout",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const response = await safeIpcInvoke<UpdateUserResponse>('auth:update-user', 
        userData, 
        { success: false }
      );

      if (response?.success && response.user) {
        setUser(prevUser => {
          if (prevUser) {
            return { ...prevUser, ...response.user };
          }
          return null;
        });
        toast({
          title: "Success",
          description: "User updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.message || 'Failed to update user',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast({
        title: "Error",
        description: 'Failed to update user',
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (userData: { username: string; email: string; password: string }) => {
    try {
      const response = await safeIpcInvoke<AuthResponse>('auth:register', userData, { success: false });

      if (response?.success && response.user) {
        setIsAuthenticated(true);
        setUser(response.user);
        setBusiness(response.business || null);
        
        localStorage.setItem('user', JSON.stringify(response.user));
        if (response.business) {
          localStorage.setItem('business', JSON.stringify(response.business));
        }
        
        toast({
          title: "Success",
          description: "Registration successful",
        });
        return { success: true, user: response.user, business: response.business };
      }

      toast({
        title: "Error",
        description: response?.message || 'Registration failed',
        variant: "destructive",
      });
      return { success: false, message: response?.message };
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Error",
        description: 'Registration failed',
        variant: "destructive",
      });
      return { success: false, message: 'Registration failed' };
    }
  };

  const setupAccount = async (setupData: {
    businessData: any;
    locationData: any;
    shopData: any;
  }) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await safeIpcInvoke<SetupResponse>('setup:create-account', 
        {
          ...setupData,
          userId: user.id  // Ensure userId is included in the request
        }, 
        { success: false }
      );
      
      if (response?.success && response.business) {
        setBusiness(response.business);
        localStorage.setItem('setupComplete', 'true');
        localStorage.setItem('businessData', JSON.stringify(response.business));
        
        toast({
          title: "Success",
          description: "Account setup completed successfully",
        });
        router.push('/dashboard');
        return { success: true };
      }

      toast({
        title: "Error",
        description: response?.message || 'Setup failed',
        variant: "destructive",
      });
      return { success: false, message: response?.message || 'Setup failed' };
    } catch (error) {
      console.error('Setup error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, message: errorMessage };
    }
  };

  const checkSetupStatus = async () => {
    try {
      if (!user?.id) {
        return false;
      }
      
      const response = await safeIpcInvoke<SetupResponse>('setup:check-status', {
        userId: user.id
      }, {
        success: false,
        isSetupComplete: false
      });
      
      return response?.isSetupComplete || false;
    } catch (error) {
      console.error('Error checking setup status:', error);
      toast({
        title: "Error",
        description: 'Failed to check setup status',
        variant: "destructive",
      });
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const storedUser = localStorage.getItem('user');
      const storedBusiness = localStorage.getItem('business');
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        if (storedBusiness) {
          const parsedBusiness = JSON.parse(storedBusiness);
          setBusiness(parsedBusiness);
        } else {
          // If business data isn't in localStorage, try to fetch it
          await fetchBusiness();
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setBusiness(null);
        
        const authPages = ['/auth/login', '/auth/register', '/account-setup'];
        if (!authPages.includes(window.location.pathname)) {
          router.push('/auth/login');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      setBusiness(null);
      
      const authPages = ['/auth/login', '/auth/register', '/account-setup'];
      if (!authPages.includes(window.location.pathname)) {
        router.push('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusiness = async () => {
    try {
      const response = await safeIpcInvoke<BusinessResponse>('business:get', {}, {
        success: false
      });

      if (response?.success && response.business) {
        setBusiness(response.business);
        localStorage.setItem('business', JSON.stringify(response.business));
        return response.business;
      } else {
        toast({
          title: "Error",
          description: response?.message || "Failed to fetch business details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to fetch business:', error);
      toast({
        title: "Error",
        description: "Failed to fetch business details",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  const value = {
    isAuthenticated,
    user,
    business,
    setupAccount,
    checkSetupStatus,
    login,
    logout: handleLogout,
    updateUser,
    register,
    checkAuth,
    fetchBusiness,
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <AuthLayoutContext.Provider value={value}>{children}</AuthLayoutContext.Provider>;
}

export default AuthLayout;
