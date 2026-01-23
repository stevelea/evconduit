// frontend/src/hooks/useChargingSessions.ts

import { useCallback, useEffect, useState } from "react";
import { apiFetchSafe } from "@/lib/api";
import type {
  ChargingSession,
  ChargingSample,
  ChargingSessionsResponse,
  UpdateSessionData,
} from "@/types/charging";

interface UseChargingSessionsResult {
  sessions: ChargingSession[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

interface UseChargingSessionsOptions {
  limit?: number;
  vehicleId?: string;
}

export function useChargingSessions(
  options: UseChargingSessionsOptions = {}
): UseChargingSessionsResult {
  const { limit = 10, vehicleId } = options;

  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const offset = page * limit;
    let url = `/api/charging/sessions?limit=${limit}&offset=${offset}`;
    if (vehicleId) {
      url += `&vehicle_id=${vehicleId}`;
    }

    const { data, error: fetchError } = await apiFetchSafe(url);

    if (fetchError) {
      setError(fetchError.message);
      setSessions([]);
      setTotal(0);
    } else if (data) {
      const response = data as ChargingSessionsResponse;
      setSessions(response.sessions);
      setTotal(response.total);
    }

    setLoading(false);
  }, [page, limit, vehicleId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    total,
    loading,
    error,
    page,
    setPage,
    refetch: fetchSessions,
  };
}

interface UseChargingSessionDetailResult {
  session: ChargingSession | null;
  samples: ChargingSample[];
  loading: boolean;
  error: string | null;
  updateSession: (data: UpdateSessionData) => Promise<boolean>;
  refetch: () => void;
}

export function useChargingSessionDetail(
  sessionId: string | null
): UseChargingSessionDetailResult {
  const [session, setSession] = useState<ChargingSession | null>(null);
  const [samples, setSamples] = useState<ChargingSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionDetail = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setSamples([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch session detail and samples in parallel
    const [sessionRes, samplesRes] = await Promise.all([
      apiFetchSafe(`/api/charging/sessions/${sessionId}`),
      apiFetchSafe(`/api/charging/sessions/${sessionId}/samples`),
    ]);

    if (sessionRes.error) {
      setError(sessionRes.error.message);
      setSession(null);
    } else if (sessionRes.data) {
      setSession(sessionRes.data as ChargingSession);
    }

    if (samplesRes.data) {
      setSamples(samplesRes.data as ChargingSample[]);
    } else {
      setSamples([]);
    }

    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSessionDetail();
  }, [fetchSessionDetail]);

  const updateSession = useCallback(
    async (data: UpdateSessionData): Promise<boolean> => {
      if (!sessionId) return false;

      const { data: updatedData, error: updateError } = await apiFetchSafe(
        `/api/charging/sessions/${sessionId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      if (updatedData) {
        setSession(updatedData as ChargingSession);
      }

      return true;
    },
    [sessionId]
  );

  return {
    session,
    samples,
    loading,
    error,
    updateSession,
    refetch: fetchSessionDetail,
  };
}
