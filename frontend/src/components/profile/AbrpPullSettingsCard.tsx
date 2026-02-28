'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { authFetch } from '@/lib/authFetch';
import TooltipInfo from '../TooltipInfo';
import { CheckCircle, XCircle, Loader2, Activity, Download, ExternalLink, Eye, EyeOff, ChevronDown, ChevronUp, Search, Car } from 'lucide-react';

interface AbrpPullSettingsCardProps {
  userId: string;
  accessToken: string;
}

interface AbrpPullStats {
  abrp_pull_enabled: boolean;
  abrp_pull_user_token: string | null;
  abrp_pull_session_token: string | null;
  abrp_pull_api_key: string | null;
  abrp_pull_vehicle_ids: string | null;
  has_session_credentials: boolean;
  last_pull_at: string | null;
  pull_success_count: number;
  pull_fail_count: number;
  last_error: string | null;
}

interface DiscoveredVehicle {
  vehicle_id: string;
  name: string;
  car_model: string;
  has_telemetry: boolean;
  soc: number | null;
  is_charging: boolean | null;
}

export default function AbrpPullSettingsCard({ userId, accessToken }: AbrpPullSettingsCardProps) {
  void userId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [stats, setStats] = useState<AbrpPullStats | null>(null);
  const [userTokenInput, setUserTokenInput] = useState('');
  const [showUserToken, setShowUserToken] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [discoveredVehicles, setDiscoveredVehicles] = useState<DiscoveredVehicle[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());
  const [sessionTokenInput, setSessionTokenInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSessionToken, setShowSessionToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasSessionCredentials, setHasSessionCredentials] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [showTestResult, setShowTestResult] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await authFetch('/me/abrp/pull', {
      method: 'GET',
      accessToken,
    });

    if (data && !error) {
      setStats(data);
      setEnabled(data.abrp_pull_enabled ?? false);
      setHasStoredCredentials(!!data.abrp_pull_user_token);
      setHasSessionCredentials(data.has_session_credentials ?? false);
      setUserTokenInput('');
      setSessionTokenInput('');
      setApiKeyInput('');
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveCredentials = async () => {
    if (!userTokenInput.trim()) {
      toast.error('Please enter your ABRP token');
      return;
    }

    setSaving(true);
    const { error } = await authFetch('/me/abrp/pull', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ abrp_pull_user_token: userTokenInput }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error(error.message || 'Failed to save token');
    } else {
      toast.success('ABRP API token saved!');
      fetchSettings();
    }
    setSaving(false);
  };

  const handleClearCredentials = async () => {
    setSaving(true);
    const { error } = await authFetch('/me/abrp/pull', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({
        abrp_pull_user_token: '',
        abrp_pull_enabled: false,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error('Failed to clear token');
    } else {
      toast.success('ABRP API token cleared');
      setUserTokenInput('');
      setEnabled(false);
      setTestResult(null);
      setDiscoveredVehicles([]);
      setSelectedVehicleIds(new Set());
      fetchSettings();
    }
    setSaving(false);
  };

  const handleSaveSessionCredentials = async () => {
    if (!sessionTokenInput.trim() || !apiKeyInput.trim()) {
      toast.error('Both session token and API key are required');
      return;
    }
    setSavingSession(true);
    const { error } = await authFetch('/me/abrp/pull', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({
        abrp_pull_session_token: sessionTokenInput,
        abrp_pull_api_key: apiKeyInput,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (error) {
      toast.error(error.message || 'Failed to save session credentials');
    } else {
      toast.success('Session credentials saved');
      fetchSettings();
    }
    setSavingSession(false);
  };

  const handleClearSessionCredentials = async () => {
    setSavingSession(true);
    const { error } = await authFetch('/me/abrp/pull', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({
        abrp_pull_session_token: '',
        abrp_pull_api_key: '',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (error) {
      toast.error('Failed to clear session credentials');
    } else {
      toast.success('Session credentials cleared');
      fetchSettings();
    }
    setSavingSession(false);
  };

  const handleToggleEnabled = async (newEnabled: boolean) => {
    if (newEnabled && !hasStoredCredentials && !hasSessionCredentials) {
      toast.error('Please save a token or session credentials first');
      return;
    }

    setSaving(true);
    const { data, error } = await authFetch('/me/abrp/pull', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ abrp_pull_enabled: newEnabled }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error(error.message || 'Failed to update setting');
    } else {
      setEnabled(newEnabled);
      if (data?.abrp_push_disabled) {
        toast.success('ABRP API enabled — ABRP Push has been disabled to avoid circular data flow');
      } else {
        toast.success(newEnabled ? 'ABRP API enabled' : 'ABRP API disabled');
      }
      fetchSettings();
    }
    setSaving(false);
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoveredVehicles([]);
    const { data, error } = await authFetch('/me/abrp/pull/test', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ vehicle_ids: [] }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error(error.message || 'Failed to discover vehicles');
    } else if (data?.success && data.available_vehicles) {
      setDiscoveredVehicles(data.available_vehicles);
      const withTlm = new Set<string>(
        data.available_vehicles
          .filter((v: DiscoveredVehicle) => v.has_telemetry)
          .map((v: DiscoveredVehicle) => v.vehicle_id)
      );
      setSelectedVehicleIds(withTlm);
      if (data.available_vehicles.length === 0) {
        toast.error('No vehicles found in ABRP session');
      } else {
        toast.success(`Found ${data.available_vehicles.length} vehicle(s)`);
      }
    }
    setDiscovering(false);
  };

  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicleIds(prev => {
      const next = new Set(prev);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return next;
    });
  };

  const handleTestPull = async () => {
    if (selectedVehicleIds.size === 0 && discoveredVehicles.length > 0) {
      toast.error('Please select at least one vehicle');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const body = selectedVehicleIds.size > 0
      ? { vehicle_ids: Array.from(selectedVehicleIds) }
      : undefined;

    const { data, error } = await authFetch('/me/abrp/pull/test', {
      method: 'POST',
      accessToken,
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
    });

    if (error) {
      toast.error(error.message || 'Test pull failed');
    } else if (data?.success) {
      toast.success(data.message || 'Telemetry pulled from ABRP!');
      setTestResult(data);
      setShowTestResult(true);

      if (data.available_vehicles) {
        setDiscoveredVehicles(data.available_vehicles);
      }
      fetchSettings();
    } else {
      toast.error(data?.message || 'Test pull failed');
    }
    setTesting(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) return null;

  const totalPulls = (stats?.pull_success_count ?? 0) + (stats?.pull_fail_count ?? 0);
  const successRate = totalPulls > 0
    ? Math.round((stats?.pull_success_count ?? 0) / totalPulls * 100)
    : null;

  return (
    <Card id="abrp-pull" className="mb-6 scroll-mt-20">
      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold">ABRP API Integration</span>
            <TooltipInfo
              content={
                <>
                  <strong>Read vehicle data from ABRP</strong>
                  <br />
                  Use A Better Route Planner as an alternative vehicle data source.
                  Paste your ABRP user token from your ABRP account settings.
                </>
              }
              className="ml-1"
            />
          </div>
          <a
            href="https://abetterrouteplanner.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            ABRP <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* How to get token - collapsible */}
        <details className="text-xs text-gray-500 border border-gray-200 rounded-lg">
          <summary className="cursor-pointer p-2 font-medium text-gray-700 hover:bg-gray-50">
            How to get your ABRP token
          </summary>
          <ol className="p-2 pt-0 space-y-1 list-decimal list-inside">
            <li>Log in to <strong>abetterrouteplanner.com</strong></li>
            <li>Click your profile icon → <strong>Settings</strong></li>
            <li>Scroll to <strong>Integrations</strong> or <strong>API Tokens</strong></li>
            <li>Copy your <strong>user token</strong> and paste it below</li>
          </ol>
          <p className="px-2 pb-2 text-xs text-gray-400">
            Your token allows EVConduit to read your vehicle telemetry from ABRP.
          </p>
        </details>

        {/* ABRP User Token Input */}
        <div className="space-y-2">
          <Label htmlFor="abrp-pull-user-token" className="text-sm text-gray-600">
            ABRP Token
          </Label>
          <div className="relative">
            <Input
              id="abrp-pull-user-token"
              type={showUserToken ? 'text' : 'password'}
              placeholder={hasStoredCredentials && stats?.abrp_pull_user_token ? 'Saved (enter new to replace)' : 'Paste your ABRP user token'}
              value={userTokenInput}
              onChange={(e) => setUserTokenInput(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowUserToken(!showUserToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showUserToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {stats?.abrp_pull_user_token && (
            <p className="text-xs text-gray-500">Current: {stats.abrp_pull_user_token}</p>
          )}
        </div>

        {/* Save / Clear Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSaveCredentials}
            disabled={saving || !userTokenInput.trim()}
            size="sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
          {hasStoredCredentials && (
            <Button
              variant="outline"
              onClick={handleClearCredentials}
              disabled={saving}
              size="sm"
              className="text-red-500 hover:text-red-700"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Extended Data — Session Credentials (Optional) */}
        <details className="border border-gray-200 rounded-lg">
          <summary className="cursor-pointer p-3 font-medium text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between">
            <span>Extended Data (Optional)</span>
            {hasSessionCredentials && (
              <span className="text-xs text-green-600 font-normal ml-2">Active</span>
            )}
          </summary>
          <div className="p-3 pt-0 space-y-3">
            <p className="text-xs text-gray-500">
              Session credentials provide additional telemetry data (voltage, current, odometer, temperature, etc.)
              but may expire periodically. The ABRP token above is sufficient for basic data (SOC, power, charging status, battery temp, SOH).
            </p>

            <details className="text-xs text-gray-500 border border-gray-200 rounded-lg">
              <summary className="cursor-pointer p-2 font-medium text-gray-700 hover:bg-gray-50">
                How to get session credentials
              </summary>
              <ol className="p-2 pt-0 space-y-1 list-decimal list-inside">
                <li>Open <strong>abetterrouteplanner.com</strong> in your browser and log in</li>
                <li>Open <strong>Developer Tools</strong> (F12 or Ctrl+Shift+I)</li>
                <li>Go to the <strong>Network</strong> tab and look for requests to <code>api.iternio.com</code></li>
                <li>Find a request with <code>session_id</code> in the payload — copy that value as your <strong>Session Token</strong></li>
                <li>In the same request, find the <code>api_key</code> parameter or <code>Authorization: APIKEY</code> header — copy that as your <strong>API Key</strong></li>
              </ol>
              <p className="px-2 pb-2 text-xs text-gray-400">
                These credentials come from your browser session and may expire when you log out of ABRP or after some time.
                When they expire, EVConduit will automatically fall back to the standard ABRP token.
              </p>
            </details>

            <div className="space-y-2">
              <Label htmlFor="abrp-session-token" className="text-sm text-gray-600">
                Session Token
              </Label>
              <div className="relative">
                <Input
                  id="abrp-session-token"
                  type={showSessionToken ? 'text' : 'password'}
                  placeholder={hasSessionCredentials && stats?.abrp_pull_session_token ? 'Saved (enter new to replace)' : 'Paste ABRP session token'}
                  value={sessionTokenInput}
                  onChange={(e) => setSessionTokenInput(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSessionToken(!showSessionToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSessionToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {stats?.abrp_pull_session_token && (
                <p className="text-xs text-gray-500">Current: {stats.abrp_pull_session_token}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="abrp-api-key" className="text-sm text-gray-600">
                API Key
              </Label>
              <div className="relative">
                <Input
                  id="abrp-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={hasSessionCredentials && stats?.abrp_pull_api_key ? 'Saved (enter new to replace)' : 'Paste ABRP API key'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {stats?.abrp_pull_api_key && (
                <p className="text-xs text-gray-500">Current: {stats.abrp_pull_api_key}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveSessionCredentials}
                disabled={savingSession || !sessionTokenInput.trim() || !apiKeyInput.trim()}
                size="sm"
              >
                {savingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
              {hasSessionCredentials && (
                <Button
                  variant="outline"
                  onClick={handleClearSessionCredentials}
                  disabled={savingSession}
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </details>

        {/* Discover + Select Vehicles */}
        {(hasStoredCredentials || hasSessionCredentials) && (
          <div className="mt-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscover}
              disabled={discovering}
              className="w-full mb-3"
            >
              {discovering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Discover Vehicles
                </>
              )}
            </Button>

            {discoveredVehicles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Select vehicles to pull:</p>
                {discoveredVehicles.map((v) => (
                  <label
                    key={v.vehicle_id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition ${
                      selectedVehicleIds.has(v.vehicle_id)
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!v.has_telemetry ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVehicleIds.has(v.vehicle_id)}
                      onChange={() => toggleVehicleSelection(v.vehicle_id)}
                      disabled={!v.has_telemetry}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Car className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{v.name}</div>
                      <div className="text-xs text-gray-500">
                        ID: {v.vehicle_id}
                        {v.has_telemetry && v.soc !== null && (
                          <span className="ml-2">
                            Battery: <span className="font-medium">{v.soc}%</span>
                            {v.is_charging && <span className="ml-1 text-green-600">Charging</span>}
                          </span>
                        )}
                        {!v.has_telemetry && (
                          <span className="ml-2 text-amber-600">No telemetry data</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enable Toggle */}
        {(hasStoredCredentials || hasSessionCredentials) && (
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable ABRP API</Label>
              <p className="text-xs text-gray-500">
                Pull vehicle data from ABRP every 60 seconds
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={saving}
            />
          </div>
        )}

        {/* Stats Section */}
        {(hasStoredCredentials || hasSessionCredentials) && stats && totalPulls > 0 && (
          <div className="mt-2 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-sm text-gray-700">Pull Statistics</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {successRate !== null ? (
                  <>
                    {successRate >= 90 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : successRate >= 50 ? (
                      <CheckCircle className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>{successRate}% success rate</span>
                  </>
                ) : (
                  <span className="text-gray-500">No pulls yet</span>
                )}
              </div>

              {stats.last_error && (
                <div className="text-red-600 text-xs">
                  Error: {stats.last_error}
                </div>
              )}

              <div className="text-gray-600">
                <span className="text-green-600 font-medium">{stats.pull_success_count}</span> successful
              </div>
              <div className="text-gray-600">
                <span className="text-red-600 font-medium">{stats.pull_fail_count}</span> failed
              </div>

              <div className="col-span-2 text-gray-500 text-xs">
                Last pull: {formatDate(stats.last_pull_at)}
              </div>
            </div>
          </div>
        )}

        {/* Test Pull Button */}
        {(hasStoredCredentials || hasSessionCredentials) && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPull}
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Pulling...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Pull &amp; Save Vehicles
                </>
              )}
            </Button>
          </div>
        )}

        {/* Test Result Preview */}
        {testResult && (
          <div className="mt-2 border border-gray-200 rounded-lg">
            <button
              onClick={() => setShowTestResult(!showTestResult)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>Raw Response</span>
              {showTestResult ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showTestResult && (
              <pre className="p-3 pt-0 text-xs text-gray-600 overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
