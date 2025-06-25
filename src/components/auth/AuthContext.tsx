import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// Define UserRole inline to avoid TypeScript cache issues
type AppUserRole = 'super_admin' | 'admin' | 'developer' | 'developer_employee' | 'sales_agent' | 'supplier' | 'lawyer' | 'viewer' | 'external_marketing';

// Export UserRole for use in other components
export type UserRole = AppUserRole;

export interface AuthUser extends User {
  user_role?: AppUserRole;
  developer_id?: string;
  assigned_project_ids?: string[];
  full_name?: string;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
  hasAccess: (resource: string, resourceId?: string) => boolean;
  isAdmin: () => boolean;
  isDeveloper: () => boolean;
  isProjectEmployee: () => boolean;
  isSupplier: () => boolean;
  debugCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  // Debug: Track user changes
  useEffect(() => {
    // User changed tracking removed for production
  }, [user]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (import.meta.env.DEV) console.log('Initializing auth...');
        
        // First try to get session quickly (3 seconds)
        const quickTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Quick session timeout')), 3000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        let session, error;
        
        try {
          const result = await Promise.race([sessionPromise, quickTimeoutPromise]) as any;
          session = result.data?.session;
          error = result.error;
        } catch (timeoutError) {
          // Continue without blocking - user can sign in manually
          setLoading(false);
          return;
        }
        
        if (error) {
          if (import.meta.env.DEV) console.error('Session error:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          if (import.meta.env.DEV) console.log('No session found');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Always continue - don't block the app
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (import.meta.env.DEV) console.log('Auth state change:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    // Start auth initialization with delay to not block initial render
    setTimeout(initializeAuth, 50);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (authUser: User) => {
    if (isProcessingAuth) return; // מניעת עיבוד כפול
    setIsProcessingAuth(true);
    
    if (import.meta.env.DEV) console.log('Fetching user profile for:', authUser.email);
    
    try {
      if (import.meta.env.DEV) console.log('User profile data:', authUser);
      
      // Special case for super admin - avoid RLS issues for now
      if (authUser.email === 'triroars@gmail.com') {
        const enhancedUser: AuthUser = {
          ...authUser,
          user_role: 'super_admin' as AppUserRole,
          assigned_project_ids: [],
          full_name: 'TriRoars Admin',
          phone: undefined
        };

        if (import.meta.env.DEV) {
          console.log('Super admin user created:', {
            email: enhancedUser.email, 
            role: enhancedUser.user_role,
            full_name: enhancedUser.full_name 
          });
        }

        setUser(enhancedUser);
        return;
      }
      
      // For other users, try the RPC function approach
      try {
        const { data: isAdmin, error: rpcError } = await supabase.rpc('is_super_admin');
        
        if (rpcError) {
          if (import.meta.env.DEV) console.log('RPC error:', rpcError);
        } else {
          if (import.meta.env.DEV) console.log('Is admin check result:', isAdmin);
          
          if (isAdmin) {
            const enhancedUser: AuthUser = {
              ...authUser,
              user_role: 'super_admin' as AppUserRole,
              assigned_project_ids: [],
              full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
              phone: undefined
            };
            
            setUser(enhancedUser);
            return;
          }
        }
      } catch (rpcError) {
        console.log('RPC catch error:', rpcError);
      }
      
      // Fallback: set basic user
      setUser(authUser as AuthUser);
      
    } catch (error) {
      console.error('Profile fetch error:', error);
      // Always provide fallback user
      setUser(authUser as AuthUser);
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(`שגיאה בהתחברות: ${error.message}`);
        return { user: null, error };
      }

      if (data.user) {
        await fetchUserProfile(data.user);
        toast.success('התחברת בהצלחה!');
      }

      return { user: data.user as AuthUser, error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error('שגיאה בהתחברות');
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        toast.error(`שגיאה בהרשמה: ${error.message}`);
        return { user: null, error };
      }

      if (data.user) {
        toast.success('נרשמת בהצלחה! בדוק את המייל לאישור');
      }

      return { user: data.user as AuthUser, error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast.error('שגיאה בהרשמה');
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('שגיאה בהתנתקות');
        console.error('Sign out error:', error);
      } else {
        setUser(null);
        toast.success('התנתקת בהצלחה');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('שגיאה בהתנתקות');
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (resource: string, resourceId?: string): boolean => {
    if (!user) return false;
    
    // Super admin has access to everything
    if (user.user_role === 'super_admin' || user.user_role === 'admin') {
      return true;
    }

    // Developer has access to their own projects
    if (user.user_role === 'developer') {
      if (resource === 'project' && resourceId) {
        return user.developer_id === resourceId;
      }
      return true; // For now, developers have general access
    }

    // Developer employee has access to assigned projects
    if (user.user_role === 'developer_employee') {
      if (resource === 'project' && resourceId) {
        return user.assigned_project_ids?.includes(resourceId) || false;
      }
      return false;
    }

    // Other roles have limited access
    if (['sales_agent', 'supplier', 'lawyer', 'viewer', 'external_marketing'].includes(user.user_role || '')) {
      if (resource === 'project' && resourceId) {
        return user.assigned_project_ids?.includes(resourceId) || false;
      }
      return false;
    }

    return false;
  };

  const isAdmin = () => user?.user_role === 'admin' || user?.user_role === 'super_admin';
  const isDeveloper = () => user?.user_role === 'developer';
  const isProjectEmployee = () => user?.user_role === 'developer_employee';
  const isSupplier = () => user?.user_role === 'supplier';

  const debugCurrentUser = async () => {
    console.log('=== DEBUG USER INFO ===');
    console.log('Current user:', user);
    console.log('User role:', user?.user_role);
    console.log('Is admin:', isAdmin());
    console.log('Is developer:', isDeveloper());
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Current session:', sessionData);
      
      if (sessionData.session?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
          
        if (profileError) {
          console.log('Profile error:', {
            error: profileError,
            errorCode: profileError?.code,
            errorMessage: profileError?.message,
            errorDetails: profileError?.details,
            errorHint: profileError?.hint
          });
        } else {
          console.log('Profile data:', profileData);
        }
      }
    } catch (error) {
      console.error('Debug error:', error);
    }
    console.log('=== END DEBUG ===');
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    hasAccess,
    isAdmin,
    isDeveloper,
    isProjectEmployee,
    isSupplier,
    debugCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 