import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { UserRole, Developer } from '../types';

export interface AuthUser extends User {
  user_role?: UserRole;
  developer_id?: string;
  developer?: Developer;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  
  // Helper functions
  isAuthenticated: () => boolean;
  hasRole: (role: UserRole) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isDeveloper: () => boolean;
  canAccessProject: (projectId: string) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user details from our users table
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            *,
            developer:developers(*)
          `)
          .eq('id', data.user.id)
          .single();

        if (userError) throw userError;

        const userWithRole: AuthUser = {
          ...data.user,
          user_role: userData.user_role,
          developer_id: userData.developer_id,
          developer: userData.developer,
        };

        set({ user: userWithRole });
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select(`
            *,
            developer:developers(*)
          `)
          .eq('id', session.user.id)
          .single();

        if (error) {
          set({ user: session.user as AuthUser });
        } else {
          const userWithRole: AuthUser = {
            ...session.user,
            user_role: userData.user_role,
            developer_id: userData.developer_id,
            developer: userData.developer,
          };
          set({ user: userWithRole });
        }
      } else {
        set({ user: null });
      }
    } catch (error) {
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  // Helper functions
  isAuthenticated: () => {
    const { user } = get();
    return !!user;
  },

  hasRole: (role: UserRole) => {
    const { user } = get();
    return user?.user_role === role;
  },

  isAdmin: () => {
    const { user } = get();
    return user?.user_role === 'admin' || user?.user_role === 'super_admin';
  },

  isSuperAdmin: () => {
    const { user } = get();
    return user?.user_role === 'super_admin';
  },

  isDeveloper: () => {
    const { user } = get();
    return user?.user_role === 'developer';
  },

  canAccessProject: (projectId: string) => {
    const { user } = get();
    if (!user) return false;
    
    // Super admin and admin can access all projects
    if (user.user_role === 'super_admin' || user.user_role === 'admin') {
      return true;
    }
    
    // Developer can access their own projects
    if (user.user_role === 'developer' && user.developer_id) {
      return true; // Would need to check if project belongs to developer
    }
    
    // Project employees and suppliers need specific assignment checks
    return false;
  },
})); 