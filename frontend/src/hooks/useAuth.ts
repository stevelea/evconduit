// frontend/app/hooks/useAuth.ts

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/authFetch';
import type { User } from '@supabase/supabase-js';
import type { UserDetails } from '@/types/userDetails'; // Import UserDetails

/**
 * Extend MergedUser to include `is_subscribed`.
 */
interface MergedUser extends UserDetails {
  // NEW: whether the user is subscribed to the newsletter
  is_subscribed?: boolean; /* Hardcoded string */
  stripe_customer_id?: string;
  sms_credits?: number;
  tier?: 'free' | 'pro'; /* Hardcoded string */ /* Hardcoded string */
  online_status?: 'green' | 'yellow' | 'red' | 'grey';
}

export function useAuth({
  redirectTo = '/login', /* Hardcoded string */
  requireAuth = true,
}: {
  redirectTo?: string;
  requireAuth?: boolean;
} = {}) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [mergedUser, setMergedUser] = useState<MergedUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<'green' | 'yellow' | 'red' | 'grey'>('grey'); /* Hardcoded string */ /* Hardcoded string */ /* Hardcoded string */ /* Hardcoded string */
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1) Sync accessToken when the Supabase session changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        setAccessToken(session.access_token);
      } else {
        setAccessToken(null);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 2) On initial mount, fetch the Supabase session and then GET /me to populate mergedUser /* Hardcoded string */
  useEffect(() => {
    const fetchUserAndMe = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!session || error) {
        // No active session or an error occurred: clear everything and optionally redirect /* Hardcoded string */
        setAuthUser(null);
        setMergedUser(null);
        setAccessToken(null);
        setOnlineStatus('grey'); /* Hardcoded string */
        if (requireAuth) router.push(redirectTo);
      } else {
        // We have a valid Supabase session
        setAuthUser(session.user);
        setAccessToken(session.access_token);

        // Fetch "/me" from your backend to get roles, profile fields, etc.
        const { data, error: meError } = await authFetch('/me', {
          method: 'GET',
          accessToken: session.access_token,
        });

        if (!meError && data) {
          setMergedUser(data as MergedUser);
          setOnlineStatus((data as MergedUser).online_status ?? 'grey'); /* Hardcoded string */
        } else {
          // If backend /me failed, clear mergedUser /* Hardcoded string */
          setMergedUser(null);
          setOnlineStatus('grey'); /* Hardcoded string */
        }
      }

      setLoading(false);
    };

    fetchUserAndMe();
  }, [router, redirectTo, requireAuth]);

  // Note: Vehicle realtime updates are now handled centrally in UserContext
  // to prevent duplicate API calls across the app

  return {
    user: authUser,
    mergedUser,
    accessToken,
    loading,
    isAdmin: mergedUser?.role === 'admin', /* Hardcoded string */
    isApproved: mergedUser?.is_approved === true,
    hasAcceptedTerms: mergedUser?.accepted_terms === true,
    onlineStatus,
  };
}
