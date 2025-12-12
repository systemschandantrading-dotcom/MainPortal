import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const APP_SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;

interface User {
  id: string;
  role: string;
  username?: string;
  pageAccess?: string;
  deploymentLink?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (userId: string, password: string) => Promise<boolean>; // Changed to userId
  logout: () => void;
  clearError: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,

      login: async (userId: string, password: string): Promise<boolean> => { // Changed to userId
        set({ loading: true, error: null });
        
        try {
          console.log('Attempting login with User ID:', { userId, APP_SCRIPT_URL });
          
          // Create URL parameters - using userId instead of username
          const params = new URLSearchParams({
            action: 'login',
            userId: userId.trim(), // Changed to userId
            password: password.trim()
          });

          const fullUrl = `${APP_SCRIPT_URL}?${params}`;
          console.log('Making request to:', fullUrl);

          const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          console.log('Response status:', response.status);
          const result = await response.json();
          console.log('Response data:', result);

          if (result.success && result.user) {
            set({
              isAuthenticated: true,
              user: result.user,
              loading: false,
              error: null
            });
            return true;
          } else {
            const errorMsg = result.error || 'Invalid User ID or password';
            set({
              loading: false,
              error: errorMsg
            });
            return false;
          }
        } catch (error) {
          console.error('Login error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Network error. Please try again.';
          set({
            loading: false,
            error: errorMsg
          });
          return false;
        }
      },

      logout: () => {
        set({ 
          isAuthenticated: false, 
          user: null,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user
      })
    }
  )
);

export default useAuthStore;