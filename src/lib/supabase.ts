import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  throw new Error('Supabase credentials not found! Please connect to Supabase by clicking the "Connect to Supabase" button.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL environment variable.');
}

// Log configuration for debugging (remove in production)
console.log('Supabase Configuration:');
console.log('URL:', supabaseUrl);
console.log('Anon Key exists:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    },
  },
  // Add retry configuration for network issues
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Test connection on initialization with better error handling
let connectionTestPromise: Promise<boolean> | null = null;

// Add retry utility function
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1500
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors, only on network errors and database timeouts
      const isNetworkError = error.message?.includes('Failed to fetch') || error.name === 'TypeError';
      const isDatabaseTimeout = error.code === '57014' || error.message?.includes('canceling statement due to statement timeout');
      const isRetryableError = isNetworkError || isDatabaseTimeout;
      
      if (!isRetryableError) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        // Use longer delays for database timeouts
        const multiplier = isDatabaseTimeout ? 3 : 2;
        const delay = baseDelay * Math.pow(multiplier, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms... (${isDatabaseTimeout ? 'Database timeout' : 'Network error'})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

export const testSupabaseConnection = async (): Promise<boolean> => {
  if (connectionTestPromise) {
    return connectionTestPromise;
  }

  connectionTestPromise = (async () => {
    try {
      // Use a simpler connection test with retry
      const { data, error } = await retryWithBackoff(() => supabase.auth.getSession());
      
      if (error && error.message.includes('Failed to fetch')) {
        console.error('Supabase connection test failed: Network error');
        console.error('Please check:');
        console.error('1. Your internet connection');
        console.error('2. Supabase project URL is correct');
        console.error('3. CORS settings in Supabase dashboard include your development URL');
        console.error('4. Supabase project is not paused');
        return false;
      }
      
      console.log('Supabase connection test successful');
      return true;
    } catch (error: any) {
      console.error('Supabase connection error:', error);
      
      // Only log detailed errors for actual network issues
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        console.error('This appears to be a CORS issue or network problem.');
        console.error('Please check:');
        console.error('1. Your internet connection');
        console.error('2. Supabase project URL is correct');
        console.error('3. CORS settings in Supabase dashboard include your development URL');
        console.error('4. Supabase project is not paused');
        return false;
      }
      
      // For other errors, assume connection is working but there might be auth issues
      console.log('Connection appears to be working, continuing...');
      return true;
    }
  })();

  return connectionTestPromise;
};

// Initialize connection test
testSupabaseConnection();

export async function signUpUser(email: string, password: string, fullName?: string) {
  try {
    // First create the auth user
    const { data, error } = await retryWithBackoff(() => 
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      })
    );

    if (error) throw error;

    // Check if user already exists in users table
    const { data: existingUser } = await retryWithBackoff(() =>
      supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle()
    );

    // Only insert into users table if user doesn't exist
    if (!existingUser) {
      const { error: userError } = await retryWithBackoff(() =>
        supabase
          .from('users')
          .insert([{ email }])
      );

      if (userError) throw userError;
    }

    // Check if profile already exists
    const { data: existingProfile } = await retryWithBackoff(() =>
      supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle()
    );

    // Only insert into profiles table if profile doesn't exist
    if (!existingProfile) {
      const { error: profileError } = await retryWithBackoff(() =>
        supabase
          .from('profiles')
          .insert([{ 
            email,
            role: 'guest'
          }])
      );

      if (profileError) throw profileError;
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Sign up error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return { data: null, error: 'Network error: Unable to connect to the server. Please check your internet connection and try again.' };
    }
    
    if (error.message?.includes('timeout')) {
      return { data: null, error: 'Request timeout: The server is taking too long to respond. Please try again.' };
    }
    
    return { data: null, error: error.message };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    const { data: authData, error: authError } = await retryWithBackoff(() =>
      supabase.auth.signInWithPassword({
        email,
        password,
      })
    );

    if (authError) throw authError;

    // Get user profile
    const { data: profileData, error: profileError } = await retryWithBackoff(() =>
      supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()
    );

    if (profileError) {
      console.warn('Profile fetch error:', profileError);
      // Don't throw error, just use default role
    }

    // If no profile exists yet, use default guest role
    const userRole = profileData?.role || 'guest';

    return { 
      data: {
        user: {
          ...authData.user,
          role: userRole
        }
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return { data: null, error: 'Network error: Unable to connect to the server. Please check your internet connection and try again.' };
    }
    
    if (error.message?.includes('timeout')) {
      return { data: null, error: 'Request timeout: The server is taking too long to respond. Please try again.' };
    }
    
    return { data: null, error: error.message };
  }
}

export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    // Handle expired JWT gracefully - the goal is to clear local session
    if (error.message?.includes('bad_jwt') || 
        error.message?.includes('token is expired') ||
        error.message?.includes('invalid JWT')) {
      console.warn('Sign out warning: JWT expired, but local session will be cleared');
      return { error: null }; // Consider this successful since local session is cleared
    }
    
    console.error('Sign out error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return { error: 'Network error: Unable to connect to the server. Please check your internet connection and try again.' };
    }
    
    if (error.message?.includes('timeout')) {
      return { error: 'Request timeout: The server is taking too long to respond. Please try again.' };
    }
    
    return { error: error.message };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { session }, error: sessionError } = await retryWithBackoff(() =>
      supabase.auth.getSession()
    );
    
    if (sessionError) {
      // Handle session errors more gracefully
      if (sessionError.message?.includes('Auth session missing!') || 
          sessionError.message?.includes('session_not_found') || 
          sessionError.message?.includes('token is expired') ||
          sessionError.message?.includes('Session from session_id claim in JWT does not exist')) {
        return { user: null, error: null }; // Expected scenario, not an error
      }
      
      // Handle session errors more gracefully
      if (sessionError.message?.includes('Failed to fetch') || sessionError.name === 'TypeError') {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and CORS settings in Supabase dashboard.');
      }
      throw sessionError;
    }
    
    if (!session) {
      return { user: null, error: null };
    }

    const { data: authData, error: authError } = await retryWithBackoff(() =>
      supabase.auth.getUser()
    );
    if (authError) {
      // Handle auth errors more gracefully
      if (authError.message?.includes('Auth session missing!') || 
          authError.message?.includes('session_not_found') || 
          authError.message?.includes('token is expired') ||
          authError.message?.includes('Session from session_id claim in JWT does not exist')) {
        return { user: null, error: null }; // Expected scenario, not an error
      }
      
      // Handle auth errors more gracefully
      if (authError.message?.includes('Failed to fetch') || authError.name === 'TypeError') {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and CORS settings in Supabase dashboard.');
      }
      throw authError;
    }
    
    if (authData?.user) {
      // Get user profile
      const { data: profileData, error: profileError } = await retryWithBackoff(() =>
        supabase
          .from('profiles')
          .select('*')
          .eq('email', authData.user.email)
          .maybeSingle()
      );

      if (profileError) {
        console.warn('Profile fetch error:', profileError);
        // Don't throw error, just use default role
      }

      // Use default guest role if no profile exists yet
      const userRole = profileData?.role || 'guest';

      return { 
        user: {
          email: authData.user.email ?? '',
          full_name: authData.user.user_metadata.full_name,
          created_at: authData.user.created_at,
          last_sign_in_at: authData.user.last_sign_in_at,
          role: userRole,
          organization_name: profileData?.organization_name || null,
          original_role: profileData?.original_role || null
        }, 
        error: null 
      };
    }
    
    return { user: null, error: null };
  } catch (error: any) {
    // Handle authentication-related issues as warnings, not errors
    if (error.message?.includes('Auth session missing!') ||
        error.message?.includes('session_not_found') ||
        error.message?.includes('token is expired') ||
        error.message?.includes('Session from session_id claim in JWT does not exist')) {
      return { user: null, error: null }; // Expected scenario, not an error
    }
    
    console.error('Get current user error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return { user: null, error: 'Network error: Unable to connect to the server. Please check your internet connection and CORS settings in Supabase dashboard.' };
    }
    
    if (error.message?.includes('timeout')) {
      return { user: null, error: 'Request timeout: The server is taking too long to respond. Please try again.' };
    }
    
    return { user: null, error: error.message };
  }
}