import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 5
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'real-estate-marketing'
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000)
      });
    }
  },
  db: {
    schema: 'public'
  }
});

// Quick connectivity test only in development
if (import.meta.env.DEV) {
  setTimeout(async () => {
    try {
      const start = Date.now();
      
      await fetch(supabaseUrl + '/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': supabaseAnonKey,
          'authorization': `Bearer ${supabaseAnonKey}`
        },
        signal: AbortSignal.timeout(3000)
      });
      
      const duration = Date.now() - start;
      if (duration > 2000) {
      }
    } catch (error) {
    }
  }, 100);
} 