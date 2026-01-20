// src/hooks/useUserDetails.ts
import { useSupabase } from '@/lib/supabaseContext';
import { useCallback, useEffect, useState } from 'react';
import type { UserDetails } from '@/types/userDetails'; // Import from central types
import { authFetch } from '@/lib/authFetch';

export type UserVehicle = {
  vehicle_id: string;
  vendor: string;
  updated_at?: string;
  online?: boolean;
  country_code?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
};

export type WebhookLog = {
  id: string;
  created_at: string;
  event_type: string;
  vehicle_id: string;
};

export type PollLog = {
  id: string;
  created_at: string;
  endpoint: string;
  vehicle_id: string;
};

export function useUserDetails(userId: string) {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [pollLogs, setPollLogs] = useState<PollLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserDetails = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setVehicles([]);
      setLoading(false);
      setError("No user ID provided.");
      return;
    }

    setLoading(true);

    // Get access token for admin API call
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("No access token available.");
      setLoading(false);
      return;
    }

    // Use admin API endpoint to fetch user details
    const { data, error: fetchError } = await authFetch(`/admin/users/${userId}`, {
      method: 'GET',
      accessToken: session.access_token,
    });

    if (fetchError) {
      setError(fetchError.message || "Failed to fetch user details.");
      setUser(null);
      setVehicles([]);
    } else if (data) {
      const { vehicles: userVehicles, ...userData } = data;
      setUser(userData as UserDetails);
      setVehicles(userVehicles || []);
      setError(null);
    } else {
      setUser(null);
      setVehicles([]);
      setError("User not found.");
    }

    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const fetchLogs = useCallback(async () => {
    if (!userId) return;

    setLogsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setLogsLoading(false);
      return;
    }

    const { data, error: fetchError } = await authFetch(`/admin/users/${userId}/logs`, {
      method: 'GET',
      accessToken: session.access_token,
    });

    if (!fetchError && data) {
      setWebhookLogs(data.webhook_logs || []);
      setPollLogs(data.poll_logs || []);
    }

    setLogsLoading(false);
  }, [userId, supabase]);

  const updateUserField = async <K extends keyof UserDetails>(field: K, value: UserDetails[K]) => {
    // Get access token for admin API call
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("No access token available.");
      return false;
    }

    // Optimistic update
    const previousValue = user?.[field];
    setUser(prev => prev ? { ...prev, [field]: value } : prev);

    // Use admin API endpoint to update user
    const { error: updateError } = await authFetch(`/admin/users/${userId}`, {
      method: 'PATCH',
      accessToken: session.access_token,
      body: JSON.stringify({ [field]: value }),
    });

    if (updateError) {
      // Rollback on error
      setUser(prev => prev ? { ...prev, [field]: previousValue } : prev);
      setError(updateError.message || "Failed to update user.");
      return false;
    }
    return true;
  };


  return {
    loading,
    user,
    vehicles,
    webhookLogs,
    pollLogs,
    logsLoading,
    error,
    setUser,
    updateUserField,
    refetch: fetchUserDetails,
    fetchLogs,
  };
}

