import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle token refresh or sign out events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          // NÃO redirecionar aqui - deixar os guards fazerem isso
          return;
        }

        if (session) {
          setSession(session);
          setUser(session.user);

          // Defer profile fetch with setTimeout to avoid deadlock
          setTimeout(() => {
            if (mounted) {
              fetchProfile(session.user.id);
            }
          }, 0);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session — only if a stored token exists
    const hasStoredSession = (() => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        // Supabase v2 stores the session under sb-<project-ref>-auth-token
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (
            (projectId && key === `sb-${projectId}-auth-token`) ||
            (key.startsWith('sb-') && key.endsWith('-auth-token'))
          ) {
            const raw = localStorage.getItem(key);
            if (raw && raw.includes('refresh_token')) return true;
          }
        }
      } catch {
        // localStorage may be unavailable; fall through to attempt getSession
        return true;
      }
      return false;
    })();

    if (!hasStoredSession) {
      // No stored refresh token — skip getSession() entirely to avoid the
      // "Invalid Refresh Token: Refresh Token Not Found" error being logged.
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    } else {
      supabase.auth
        .getSession()
        .then(async ({ data: { session }, error }) => {
          if (!mounted) return;

          if (error) {
            const msg = error.message ?? '';
            if (
              msg.includes('Refresh Token Not Found') ||
              msg.includes('Invalid Refresh Token') ||
              msg.includes('refresh_token_not_found')
            ) {
              // Clean orphaned tokens silently
              try {
                await supabase.auth.signOut({ scope: 'local' });
              } catch {
                /* noop */
              }
            } else {
              console.error('Session error:', error);
            }
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          console.log('Initial session:', session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            setTimeout(() => {
              if (mounted) {
                fetchProfile(session.user.id);
              }
            }, 0);
          }

          setLoading(false);
        })
        .catch(async (err: any) => {
          if (!mounted) return;
          const msg = err?.message ?? '';
          if (
            msg.includes('Refresh Token Not Found') ||
            msg.includes('Invalid Refresh Token') ||
            msg.includes('refresh_token_not_found')
          ) {
            try {
              await supabase.auth.signOut({ scope: 'local' });
            } catch {
              /* noop */
            }
          } else {
            console.error('Session error:', err);
          }
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        });
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If JWT expired, sign out (redirect happens via ProtectedRoute)
        if (error.code === 'PGRST301' || error.code === 'PGRST302' || error.code === 'PGRST303' || error.message?.includes('JWT')) {
          console.log('JWT expired, signing out...');
          await supabase.auth.signOut();
        }
        return;
      }

      console.log('Profile loaded:', data.email, data.role);
      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      // Navigate will happen automatically via onAuthStateChange
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    // Redirect via window.location para evitar conflito com React Router
    window.location.href = '/autenticacao';
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
