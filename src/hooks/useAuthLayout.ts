import { useEffect, useState } from 'react';

export interface AuthLayoutState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuthLayout = () => {
  const [state, setState] = useState<AuthLayoutState>({
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        // Add your authentication check logic here
        setState({
          isAuthenticated: true, // Set this based on your auth logic
          isLoading: false,
        });
      } catch (error) {
        setState({
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, []);

  return state;
};

export default useAuthLayout;
