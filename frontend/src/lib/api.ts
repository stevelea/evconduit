// src/lib/api.ts

import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

// If you're using Next.js rewrites to proxy `/api/*` to your FastAPI backend,
// then any fetch to a path starting with `/api/` should go through the same origin (3000)
// and be rewritten by Next.js. Other calls (e.g. `/api/auth/*`) remain local to Next.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

/**
 * Safe wrapper around fetch that:
 * - If endpoint starts with '/api/', uses same-origin and Next.js rewrite.
 * - Otherwise, prefixes API_BASE_URL if provided.
 * - Automatically injects Supabase JWT from session.
 */
export async function apiFetchSafe(
  endpoint: string,
  options?: RequestInit
) {
  // Determine full URL
  let url: string;

  // Always use the backend URL if configured
  if (API_BASE_URL && endpoint.startsWith("/api/")) {
    // Remove /api prefix from endpoint since API_BASE_URL already includes it
    const path = endpoint.replace(/^\/api/, "");
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    url = `${base}${path}`;
    console.log('[apiFetchSafe] Constructed URL:', url, 'from endpoint:', endpoint);
  } else if (endpoint.startsWith("/api/")) {
    // use same-origin so Next.js rewrites to backend (fallback)
    url = endpoint;
    console.log('[apiFetchSafe] Using same-origin URL:', url);
  } else {
    // external route (e.g. auth routes or others)
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    url = `${base}${path}`;
    console.log('[apiFetchSafe] External URL:', url);
  }

  // Inject Supabase JWT if available
  let tokenHeader = {};
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      tokenHeader = { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // ignore
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...tokenHeader,
        ...(options?.headers || {}),
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      // No JSON body returned
      console.warn("[apiFetchSafe] No JSON body returned"); /* Hardcoded string */
    }

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: data?.detail || `Request failed with status ${response.status}`, /* Hardcoded string */
          status: response.status,
        },
      };
    }

    return { data, error: null };
  } catch (err: unknown) {
    console.error("[apiFetchSafe] error:", err); /* Hardcoded string */
    const message = err instanceof Error ? err.message : "Unknown error"; /* Hardcoded string */
    toast.error(message);
    return { data: null, error: { message } };
  }
}

/**
 * Download charging sessions as CSV file.
 * Triggers a file download in the browser.
 */
export async function downloadChargingSessionsCsv(vehicleId?: string): Promise<void> {
  // Build URL
  let url = `/api/charging/sessions/export/csv`;
  if (vehicleId) {
    url += `?vehicle_id=${vehicleId}`;
  }

  // Determine full URL (same logic as apiFetchSafe)
  let fullUrl: string;
  if (API_BASE_URL && url.startsWith("/api/")) {
    const path = url.replace(/^\/api/, "");
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    fullUrl = `${base}${path}`;
  } else {
    fullUrl = url;
  }

  // Get auth token
  let tokenHeader: Record<string, string> = {};
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      tokenHeader = { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // ignore
  }

  // Fetch CSV
  const response = await fetch(fullUrl, {
    headers: tokenHeader,
  });

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }

  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = "charging_sessions.csv";
  if (contentDisposition) {
    const match = contentDisposition.match(/filename=([^;]+)/);
    if (match) {
      filename = match[1].replace(/"/g, "");
    }
  }

  // Create blob and trigger download
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}
