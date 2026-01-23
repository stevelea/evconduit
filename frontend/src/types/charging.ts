// frontend/src/types/charging.ts

export interface ChargingLocation {
  name: string | null;
  address: string | null;
  operator: string | null;
  distance_meters: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ChargingSession {
  session_id: string;
  vehicle_id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  start_time: string;
  end_time: string;
  start_battery_level: number | null;
  end_battery_level: number | null;
  energy_added_kwh: number | null;
  duration_minutes: number | null;
  max_charge_rate_kw: number | null;
  average_charge_rate_kw: number | null;
  cost_per_kwh: number | null;
  total_cost: number | null;
  currency: string | null;
  default_currency: string | null;
  user_odometer_km: number | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  charging_location: ChargingLocation | null;
  consumption_kwh_per_100km: number | null;
  distance_since_last_session_km: number | null;
}

export interface ChargingSample {
  sample_time: string;
  battery_level: number | null;
  charge_rate_kw: number | null;
}

export interface ChargingSessionsResponse {
  sessions: ChargingSession[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdateSessionData {
  cost_per_kwh?: number | null;
  total_cost?: number | null;
  currency?: string;
  user_odometer_km?: number | null;
}
