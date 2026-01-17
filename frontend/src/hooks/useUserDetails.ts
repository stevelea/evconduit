// src/hooks/useUserDetails.ts
import { useSupabase } from '@/lib/supabaseContext';
import { useEffect, useState } from 'react';
import type { UserDetails } from '@/types/userDetails'; // Import from central types
import { authFetch } from '@/lib/authFetch';

export type UserVehicle = {
  vehicle_id: string;
  vendor: string;
  updated_at?: string;
  online?: boolean;
};

export function useUserDetails(userId: string) {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setVehicles([]);
      setLoading(false);
      setError("No user ID provided.");
      return;
    }

    const fetchUserDetails = async () => {
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
    };

    fetchUserDetails();
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
    error,
    setUser,
    updateUserField,
  };
}

