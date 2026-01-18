'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/authFetch';
import type { User } from '@supabase/supabase-js';
import type { UserDetails } from '@/types/userDetails';

interface MergedUser extends UserDetails {
  approved: boolean;
  online_status?: 'green' | 'yellow' | 'red' | 'grey';
  tier?: 'free' | 'basic' | 'pro';
  is_on_trial?: boolean;
  trial_ends_at?: string | null;
  sms_credits?: number;
  purchased_api_tokens?: number;
}

type UserContextType = {
  user: User | null;
  mergedUser: MergedUser | null;
  accessToken: string | null;
  loading: boolean;
  onlineStatus: 'green' | 'yellow' | 'red' | 'grey';
  refreshUser: (showSkeleton?: boolean) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mergedUser, setMergedUser] = useState<MergedUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Debounce ref to prevent multiple rapid /me calls
  const lastFetchTime = useRef<number>(0);
  const pendingFetch = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUserAndMe = useCallback(async (showSkeleton = false) => {
    // Debounce: skip if called within 1 second of last fetch
    const now = Date.now();
    if (now - lastFetchTime.current < 1000) {
      return;
    }
    lastFetchTime.current = now;

    if (showSkeleton) setLoading(true);
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session || error) {
      setUser(null);
      setMergedUser(null);
      setAccessToken(null);
    } else {
      setUser(session.user);
      setAccessToken(session.access_token);
      const { data, error: meError } = await authFetch('/me', {
        method: 'GET',
        accessToken: session.access_token,
      });
      if (!meError && data) {
        setMergedUser(data as MergedUser);
      } else {
        setMergedUser(null);
      }
    }
    setLoading(false);
    setHasLoadedOnce(true);
  }, []);

  // Initial load and auth state changes
  useEffect(() => {
    fetchUserAndMe(true);

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        setAccessToken(session.access_token);
        setUser(session.user);
        fetchUserAndMe(false);
      } else {
        setUser(null);
        setMergedUser(null);
        setAccessToken(null);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [fetchUserAndMe]);

  // Centralized vehicle realtime listener - debounced to prevent excessive API calls
  useEffect(() => {
    if (!user?.id || !accessToken) return;

    const channel = supabase
      .channel('user-vehicles-central')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Debounce vehicle updates - wait 500ms before fetching
          if (pendingFetch.current) {
            clearTimeout(pendingFetch.current);
          }
          pendingFetch.current = setTimeout(() => {
            fetchUserAndMe(false);
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (pendingFetch.current) {
        clearTimeout(pendingFetch.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user?.id, accessToken, fetchUserAndMe]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    mergedUser,
    accessToken,
    loading: !hasLoadedOnce ? loading : false,
    onlineStatus: mergedUser?.online_status ?? 'grey',
    refreshUser: fetchUserAndMe,
  }), [user, mergedUser, accessToken, loading, hasLoadedOnce, fetchUserAndMe]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be used within a UserProvider'); /* Hardcoded string */
  return ctx;
};
