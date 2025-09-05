import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, signInUser, signOutUser, signUpUser } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { AuthState, FormValues, User } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error: string | null; role?: string }>;
  register: (values: FormValues) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<{ success: boolean; error: string | null }>;
  returnToAdmin: () => Promise<{ success: boolean; error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function loadUser() {
      try {
        // Add a small delay to allow network to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { user, error } = await getCurrentUser();
        
        if (error) {
          // Check if the error is related to invalid/missing session or expired token
          if (error.includes('Auth session missing!') || error.includes('session_not_found') || error.includes('token is expired')) {
            // Clear the invalid session from client-side storage
            await supabase.auth.signOut();
            setAuthState({ user: null, isLoading: false, error: null });
            return;
          }
          
          // For network errors, don't set them as persistent errors
          if (error.includes('Network error') || error.includes('Failed to fetch')) {
            console.warn('Network error during user load, will retry on next action:', error);
            setAuthState({ user: null, isLoading: false, error: null });
            return;
          }
          
          // Don't show connection errors to user on initial load
          console.warn('Auth error during initial load:', error);
          setAuthState({ user: null, isLoading: false, error: null });
          return;
        }
        
        setAuthState({ user, isLoading: false, error: null });
      } catch (error: any) {
        // Handle authentication session errors specifically
        if (error.message?.includes('Auth session missing!') || 
            error.message?.includes('session_not_found') || 
            error.message?.includes('token is expired') ||
            error.message?.includes('Session from session_id claim in JWT does not exist')) {
          // Clear the invalid session from client-side storage
          await supabase.auth.signOut();
          setAuthState({ user: null, isLoading: false, error: null });
          return;
        }
        
        console.warn('Error loading user session, continuing without auth:', error);
        // Don't set loading errors as persistent state errors
        setAuthState({ user: null, isLoading: false, error: null });
      }
    }
    
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data: authData, error: authError } = await signInUser(email, password);
      
      if (authError) throw authError;
      
      if (authData?.user) {
        const user: User = {
          email: authData.user.email ?? '',
          full_name: authData.user.user_metadata.full_name,
          created_at: authData.user.created_at,
          last_sign_in_at: authData.user.last_sign_in_at,
          role: authData.user.role || 'guest'
        };
        
        setAuthState({ user, isLoading: false, error: null });
        return { success: true, error: null, role: user.role };
      }
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Login failed with unknown error' };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
  };

  const register = async (values: FormValues) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data, error } = await signUpUser(values.email, values.password || '', values.fullName);
      
      if (error) {
        setAuthState(prev => ({ ...prev, isLoading: false, error }));
        return { success: false, error };
      }
      
      if (data?.user) {
        const user: User = {
          email: data.user.email ?? '',
          full_name: data.user.user_metadata.full_name,
          created_at: data.user.created_at,
          last_sign_in_at: data.user.last_sign_in_at,
          role: 'guest' // New users always start as guests
        };
        
        setAuthState({ user, isLoading: false, error: null });
        return { success: true, error: null };
      }
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: true, error: null };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { error } = await signOutUser();
      
      if (error) {
        setAuthState(prev => ({ ...prev, isLoading: false, error }));
        return { success: false, error };
      }
      
      setAuthState({ user: null, isLoading: false, error: null });
      return { success: true, error: null };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
  };

  const returnToAdmin = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Vérifier si l'utilisateur est admin_client et restaurer le rôle original
      if (authState.user?.role === 'admin_client') {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('original_role')
          .eq('email', authState.user.email)
          .single();
        
        if (profileData?.original_role) {
          // Restaurer le rôle original (admin) et nettoyer les données d'organisation
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: profileData.original_role,
              organization_name: null,
              organization_level: null,
              original_role: null
            })
            .eq('email', authState.user.email);
          
          if (updateError) throw updateError;
          
          // Mettre à jour l'état local
          const updatedUser = {
            ...authState.user,
            role: profileData.original_role as 'admin' | 'guest' | 'contributeur' | 'validateur' | 'admin_client'
          };
          
          setAuthState({ user: updatedUser, isLoading: false, error: null });
          return { success: true, error: null };
        }
      }
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Impossible de retourner au rôle admin' };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, register, logout, returnToAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};