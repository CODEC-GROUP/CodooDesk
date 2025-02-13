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

interface Shop {
  id: string;
  name: string;
  type: string;
  status: string;
  contactInfo: any;
  manager: string;
  managerId: string;
  businessId: string;
  location?: {
    address: string;
    city: string;
    country: string;
    region: string;
    postalCode?: string;
  };
  operatingHours: any;
  employees?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    locationId?: string;
    isActive: boolean;
  };
  business?: Business | null;
  shops?: Shop[];
  shop?: Shop;
  isSetupComplete?: boolean;
  token?: string;
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
  currentShopId: string | null;
  availableShops: Array<{
    id: string;
    name: string;
    type: string;
  }> | null;
  setCurrentShop: (shopId: string) => void;
  setupAccount: (setupData: any) => Promise<{ success: boolean; message?: string }>;
  checkSetupStatus: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  register: (userData: any) => Promise<{ success: boolean; message?: string }>;
  checkAuth: () => Promise<void>;
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
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [availableShops, setAvailableShops] = useState<Array<{
    id: string;
    name: string;
    type: string;
  }> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const setCurrentShop = (shopId: string) => {
    setCurrentShopId(shopId);
    localStorage.setItem('currentShopId', shopId);
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('[Auth] Starting login process...');
      console.log('[Auth] Checking window.electron availability:', !!window.electron);
      
      const response = await safeIpcInvoke<AuthResponse>('auth:login', { email, password });

      console.log('[Auth] Login response received:', {
        success: response?.success,
        hasUser: !!response?.user,
        hasBusiness: !!response?.business,
        error: response?.message
      });
      
      if (response?.success && response.user) {
        // Unified shop handling for admin/shop_owner
        if (response.shops) {
          setAvailableShops(response.shops);
          localStorage.setItem('availableShops', JSON.stringify(response.shops));
        }

        // Common data storage
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('isAuthenticated', 'true');
        
        if (response.business) {
          localStorage.setItem('business', JSON.stringify(response.business));
        }

        // Unified state update
        setIsAuthenticated(true);
        setUser(response.user);
        setBusiness(response.business || null);

        toast({
          title: "Success",
          description: "Logged in successfully",
        });

        // Navigation logic
        setTimeout(() => {
          if (response.user?.role === 'admin') {
            router.push('/admin/dashboard');
          }
          else if (response.user?.role === 'shop_owner') {
            response.isSetupComplete ? router.push('/dashboard') : router.push('/account-setup');
          }
          else {
            response.shop ? router.push('/dashboard') : router.push('/shop-selection');
          }
        }, 1000);

        return {
          success: true,
          user: response.user,
          business: response.business,
          shopId: response.shop?.id,
          isSetupComplete: response.isSetupComplete,
          token: response.token
        };
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

  const handleLogout = () => {
    console.log('Logging out, clearing all state and storage');
    // Clear all state
    setUser(null);
    setBusiness(null);
    setIsAuthenticated(false);
    setAvailableShops(null);
    setCurrentShopId(null);
    
    // Clear all storage in one go
    localStorage.clear();
    
    // Redirect to login
    router.push('/auth/login');
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

  const register = async (userData: any) => {
    try {
      const response = await safeIpcInvoke<AuthResponse>('auth:register', userData, { success: false });

      if (response?.success && response.user) {
        // Save data to localStorage first
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Then update state
        setIsAuthenticated(true);
        setUser(response.user);
        setBusiness(null); // New user won't have business yet

        toast({
          title: "Success", 
          description: "Registration successful",
        });

        console.log('Registration successful, navigating to account setup...');
        
        router.push('/account-setup');
        return { success: true, user: response.user };
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
        description: error instanceof Error ? error.message : 'Registration failed',
        variant: "destructive",
      });
      return { success: false, message: error instanceof Error ? error.message : 'Registration failed' };
    }
  };

  const setupAccount = async (setupData: any) => {
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
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const storedShops = localStorage.getItem('availableShops');
      const currentShopId = localStorage.getItem('currentShopId');
      
      // Log what we found in localStorage
      console.log('Retrieved auth data from localStorage:', {
        hasUser: !!storedUser,
        hasBusiness: !!storedBusiness,
        isAuthenticated,
        hasShops: !!storedShops,
        currentShopId
      });
      
      if (storedUser && isAuthenticated === 'true') {
        const parsedUser = JSON.parse(storedUser);
        
        // Simple auth check just to validate user exists
        const sessionValid = await safeIpcInvoke<{ success: boolean, isAuthenticated: boolean }>('auth:check', 
          { userId: parsedUser.id },
          { success: false, isAuthenticated: false }
        );

        if (!sessionValid?.success || !sessionValid?.isAuthenticated) {
          console.log('Session invalid, logging out');
          handleLogout();
          return;
        }

        const parsedBusiness = storedBusiness ? JSON.parse(storedBusiness) : null;
        const parsedShops = storedShops ? JSON.parse(storedShops) : null;
        
        // Log parsed data
        console.log('Parsed auth data:', {
          hasUser: !!parsedUser,
          hasBusiness: !!parsedBusiness,
          hasShops: !!parsedShops,
          currentShopId
        });

        // Set all state at once to avoid race conditions
        setUser(parsedUser);
        setBusiness(parsedBusiness);
        setIsAuthenticated(true);
        setAvailableShops(parsedShops);
        setCurrentShopId(currentShopId);
        return;
      }

      console.log('No valid auth data found, logging out');
      handleLogout();
    } catch (error) {
      console.error('Auth check failed:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Log what we're persisting
      console.log('Persisting auth state:', {
        isAuthenticated,
        user,
        business,
        availableShops,
        currentShopId
      });

      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(user));
      if (business) {
        localStorage.setItem('business', JSON.stringify(business));
      }
      if (availableShops) {
        localStorage.setItem('availableShops', JSON.stringify(availableShops));
      }
      if (currentShopId) {
        localStorage.setItem('currentShopId', currentShopId);
      }
    }
  }, [isAuthenticated, user, business, availableShops, currentShopId]);

  const value = {
    isAuthenticated,
    user,
    business,
    currentShopId,
    availableShops,
    setCurrentShop,
    setupAccount,
    checkSetupStatus,
    login,
    logout: handleLogout,
    updateUser,
    register,
    checkAuth,
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <AuthLayoutContext.Provider value={value}>{children}</AuthLayoutContext.Provider>;
}

export default AuthLayout;
