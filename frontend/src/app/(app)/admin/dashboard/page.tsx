'use client';

import { useUserContext } from '@/contexts/UserContext';
import { useEffect, useState, useCallback } from 'react';
// Removed useRouter import
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Activity, Zap, Database, Radio, RefreshCw, Users, Car, Home, MapPin, TrendingUp } from 'lucide-react';

interface MetricsData {
  current: {
    window_start: string;
    window_seconds: number;
    api_requests: number;
    api_errors: number;
    api_requests_per_min: number;
    db_queries: number;
    db_errors: number;
    db_queries_per_min: number;
    ha_pushes: number;
    ha_push_errors: number;
    webhook_received: number;
    webhook_per_min: number;
    avg_response_time_ms: number;
    top_endpoints: Array<{ endpoint: string; count: number }>;
  };
  previous?: {
    api_requests: number;
    webhook_received: number;
  };
}

interface InsightsData {
  total_users?: number;
  new_users_1day?: number;
  new_users_7days?: number;
  new_users_30days?: number;
  total_vehicles?: number;
  new_vehicles_1day?: number;
  new_vehicles_7days?: number;
  new_vehicles_30days?: number;
  total_revenue?: number;
  monthly_revenue?: number;
  yearly_revenue?: number;
  basic_subscriptions?: number;
  pro_subscriptions?: number;
  users_on_trial?: number;
  ha_users?: number;
  abrp_users?: number;
  vehicles_by_country?: Array<{
    country_code: string;
    country: string;
    count: number;
  }>;
  users_by_country?: Array<{
    country_code: string;
    country: string;
    count: number;
  }>;
  vehicles_by_model?: Array<{
    model: string;
    count: number;
  }>;
}

// XPeng 2025 Global Sales by Country (from EVAFocus data)
// Used as benchmark for Tech Engagement Index calculation
const XPENG_SALES_BY_COUNTRY: Record<string, number> = {
  // Europe (32,365 total - 45%)
  NO: 8445,   // Norway
  DK: 6602,   // Denmark
  FR: 3824,   // France
  DE: 3384,   // Germany
  NL: 3060,   // Netherlands
  SE: 1989,   // Sweden
  BE: 1416,   // Belgium
  PT: 986,    // Portugal
  GB: 840,    // United Kingdom
  ES: 763,    // Spain
  PL: 600,    // Poland
  IE: 148,    // Ireland
  IT: 115,    // Italy
  FI: 105,    // Finland
  CH: 60,     // Switzerland
  AT: 11,     // Austria
  CZ: 9,      // Czech Republic
  GR: 8,      // Greece
  // Middle East & North Africa (11,576 total - 16%)
  IL: 11006,  // Israel
  EG: 570,    // Egypt
  // Asia-Pacific (8,750 total - 12%)
  TH: 2757,   // Thailand
  AU: 2100,   // Australia
  MY: 1933,   // Malaysia
  SG: 1066,   // Singapore
  ID: 181,    // Indonesia
  // Latin America (35 total - 0%)
  UY: 33,     // Uruguay
  CO: 2,      // Colombia
};

interface TechEngagementResult {
  country_code: string;
  country: string;
  users: number;
  market_size: number;
  index: number;  // Users per 1000 market vehicles
}

/**
 * Calculate Tech Engagement Index for each country.
 * Index = (EVConduit users / XPeng market size) * 1000
 * Higher index = better market penetration relative to EV market potential.
 * Only includes countries with minimum 500 XPeng sales for statistical relevance.
 */
const MIN_MARKET_SIZE = 500;

function calculateTechEngagementIndex(
  usersByCountry: Array<{ country_code: string; country: string; count: number }>
): TechEngagementResult[] {
  const results: TechEngagementResult[] = [];

  for (const item of usersByCountry) {
    const marketSize = XPENG_SALES_BY_COUNTRY[item.country_code];
    if (marketSize && marketSize >= MIN_MARKET_SIZE) {
      const index = (item.count / marketSize) * 1000;
      results.push({
        country_code: item.country_code,
        country: item.country,
        users: item.count,
        market_size: marketSize,
        index: Math.round(index * 100) / 100,  // Round to 2 decimal places
      });
    }
  }

  // Sort by index descending (best engagement first)
  results.sort((a, b) => b.index - a.index);

  return results;
}

/**
 * Convert a 2-letter country code to a flag emoji.
 */
function countryCodeToFlag(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '';
  const offset = 127397;
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
}

/**
 * AdminDashboardPage component displays various statistics and insights for administrators.
 * It fetches data from backend API endpoints and presents it in a dashboard format.
 */
export default function AdminDashboardPage() {
  const { mergedUser, loading, accessToken } = useUserContext();
  // Removed router = useRouter();
  const [insights, setInsights] = useState<InsightsData>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false); // New state to prevent re-fetching
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsRefreshing, setMetricsRefreshing] = useState(false);

  // Fetch metrics with auto-refresh
  const fetchMetrics = useCallback(async () => {
    if (!accessToken) return;
    try {
      const { data, error } = await authFetch('/admin/metrics', { method: 'GET', accessToken });
      if (!error && data) {
        setMetrics(data as MetricsData);
      }
    } catch (e) {
      console.error('Error fetching metrics:', e);
    }
  }, [accessToken]);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    if (accessToken && mergedUser?.role === 'admin') {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [accessToken, mergedUser, fetchMetrics]);

  const handleRefreshMetrics = async () => {
    setMetricsRefreshing(true);
    await fetchMetrics();
    setMetricsRefreshing(false);
  };

  useEffect(() => {
    const fetchInsights = async () => {
      if (!accessToken || !mergedUser || hasFetched) { // Added hasFetched check
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      try {
        // Use consolidated endpoint for better performance (single request instead of 15)
        const { data, error } = await authFetch('/insights/all', { method: 'GET', accessToken });

        if (error) {
          toast.error(`Failed to fetch insights: ${error.message}`);
          setHasFetched(true);
          return;
        }

        setInsights(data as InsightsData);
        setHasFetched(true); // Set to true after successful fetch
      } catch (error) {
        console.error('Error fetching insights:', error);
        toast.error('Failed to fetch admin insights.');
      } finally {
        setDataLoading(false);
      }
    };

    if (accessToken && mergedUser && mergedUser.role === 'admin' && !hasFetched) { // Added hasFetched check
      fetchInsights();
    }
  }, [accessToken, mergedUser, hasFetched]); // Added hasFetched to dependencies

  if (loading || !mergedUser) {
    return (
      <div className="container py-4">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      {dataLoading ? (
        <p>Loading insights...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Platform Overview Tile */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Total Users</span>
                  </div>
                  <div className="text-2xl font-bold">{insights.total_users ?? 'N/A'}</div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Car className="w-4 h-4" />
                    <span className="text-xs font-medium">Total Vehicles</span>
                  </div>
                  <div className="text-2xl font-bold">{insights.total_vehicles ?? 'N/A'}</div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Home className="w-4 h-4" />
                    <span className="text-xs font-medium">HA Users</span>
                  </div>
                  <div className="text-2xl font-bold">{insights.ha_users ?? 'N/A'}</div>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-medium">ABRP Users</span>
                  </div>
                  <div className="text-2xl font-bold">{insights.abrp_users ?? 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.total_users ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Total Users</p>
              <div className="text-md font-bold mt-2">{insights.new_users_1day ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">New Users (24h)</p>
              <div className="text-md font-bold mt-2">{insights.new_users_7days ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">New Users (7d)</p>
              <div className="text-md font-bold mt-2">{insights.new_users_30days ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">New Users (30d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicle Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.total_vehicles ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Total Vehicles</p>
              <div className="text-md font-bold mt-2">{insights.new_vehicles_1day ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">New Vehicles (24h)</p>
              <div className="text-md font-bold mt-2">{insights.new_vehicles_7days ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">New Vehicles (7d)</p>
              <div className="text-md font-bold mt-2">{insights.new_vehicles_30days ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">New Vehicles (30d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${insights.total_revenue?.toFixed(2) ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <div className="text-md font-bold mt-2">${insights.monthly_revenue?.toFixed(2) ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              <div className="text-md font-bold mt-2">${insights.yearly_revenue?.toFixed(2) ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Yearly Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.basic_subscriptions ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Basic Subscriptions</p>
              <div className="text-md font-bold mt-2">{insights.pro_subscriptions ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Pro Subscriptions</p>
              <div className="text-md font-bold mt-2">{insights.users_on_trial ?? 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Users on Trial</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicles by Country</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.vehicles_by_country && insights.vehicles_by_country.length > 0 ? (
                <div className="space-y-2">
                  {insights.vehicles_by_country.map((item) => (
                    <div key={item.country_code} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{countryCodeToFlag(item.country_code)}</span>
                        <span className="text-sm">{item.country}</span>
                      </div>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No location data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicles by Model</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.vehicles_by_model && insights.vehicles_by_model.length > 0 ? (
                <div className="space-y-2">
                  {insights.vehicles_by_model.map((item) => (
                    <div key={item.model} className="flex items-center justify-between">
                      <span className="text-sm">{item.model}</span>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No model data available</p>
              )}
            </CardContent>
          </Card>

          {/* Tech Engagement Index Card */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Tech Engagement Index
              </CardTitle>
              <span className="text-xs text-muted-foreground">per 1K market vehicles</span>
            </CardHeader>
            <CardContent>
              {insights.users_by_country && insights.users_by_country.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {calculateTechEngagementIndex(insights.users_by_country).slice(0, 10).map((item) => {
                      // Calculate bar width as percentage of max index
                      const maxIndex = Math.max(...calculateTechEngagementIndex(insights.users_by_country!).map(i => i.index));
                      const barWidth = (item.index / maxIndex) * 100;

                      return (
                        <div key={item.country_code} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{countryCodeToFlag(item.country_code)}</span>
                              <span className="text-sm">{item.country}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-600">{item.index.toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({item.users} users / {item.market_size.toLocaleString()} mkt)
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Index based on XPeng 2025 global sales data (min. 500 sales). Higher = better market penetration.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No user location data available</p>
              )}
            </CardContent>
          </Card>

          {/* Real-time System Metrics */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Real-time System Metrics
              </CardTitle>
              <button
                onClick={handleRefreshMetrics}
                className="p-1 hover:bg-gray-100 rounded"
                disabled={metricsRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${metricsRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-medium">API Requests</span>
                    </div>
                    <div className="text-2xl font-bold">{metrics.current.api_requests}</div>
                    <div className="text-xs text-gray-500">
                      {metrics.current.api_requests_per_min}/min
                      {metrics.current.api_errors > 0 && (
                        <span className="text-red-500 ml-2">({metrics.current.api_errors} errors)</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <Radio className="w-4 h-4" />
                      <span className="text-xs font-medium">Webhooks In</span>
                    </div>
                    <div className="text-2xl font-bold">{metrics.current.webhook_received}</div>
                    <div className="text-xs text-gray-500">{metrics.current.webhook_per_min}/min</div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                      <Radio className="w-4 h-4" />
                      <span className="text-xs font-medium">HA Pushes</span>
                    </div>
                    <div className="text-2xl font-bold">{metrics.current.ha_pushes}</div>
                    <div className="text-xs text-gray-500">
                      {metrics.current.ha_push_errors > 0 ? (
                        <span className="text-red-500">{metrics.current.ha_push_errors} failed</span>
                      ) : (
                        <span className="text-green-600">All success</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                      <Database className="w-4 h-4" />
                      <span className="text-xs font-medium">Avg Response</span>
                    </div>
                    <div className="text-2xl font-bold">{metrics.current.avg_response_time_ms}ms</div>
                    <div className="text-xs text-gray-500">
                      Window: {Math.round(metrics.current.window_seconds / 60)}min
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Loading metrics...</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}