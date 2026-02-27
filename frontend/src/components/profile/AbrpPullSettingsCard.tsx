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
  abrp_pull_session_token: string | null;
  abrp_pull_api_key: string | null;
  abrp_pull_vehicle_ids: string | null;
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
  const [sessionTokenInput, setSessionTokenInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [vehicleIdsInput, setVehicleIdsInput] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [showSessionToken, setShowSessionToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [discoveredVehicles, setDiscoveredVehicles] = useState<DiscoveredVehicle[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());
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
      setHasStoredCredentials(!!(data.abrp_pull_session_token || data.abrp_pull_api_key));
      setVehicleIdsInput(data.abrp_pull_vehicle_ids || '');
      setSessionTokenInput('');
      setApiKeyInput('');
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveCredentials = async () => {
    if (!sessionTokenInput.trim() && !apiKeyInput.trim() && !vehicleIdsInput.trim()) {
      toast.error('Please enter at least one credential');
      return;
    }

    setSaving(true);
    const body: Record<string, string> = {};
    if (sessionTokenInput.trim()) body.abrp_pull_session_token = sessionTokenInput;
    if (apiKeyInput.trim()) body.abrp_pull_api_key = apiKeyInput;
    if (vehicleIdsInput.trim()) body.abrp_pull_vehicle_ids = vehicleIdsInput;

    const { error } = await authFetch('/me/abrp/pull', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error(error.message || 'Failed to save credentials');
    } else {
      toast.success('ABRP Pull credentials saved!');
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
        abrp_pull_session_token: '',
        abrp_pull_api_key: '',
        abrp_pull_vehicle_ids: '',
        abrp_pull_enabled: false,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error('Failed to clear credentials');
    } else {
      toast.success('ABRP Pull credentials cleared');
      setSessionTokenInput('');
      setApiKeyInput('');
      setVehicleIdsInput('');
      setEnabled(false);
      setTestResult(null);
      setDiscoveredVehicles([]);
      setSelectedVehicleIds(new Set());
      fetchSettings();
    }
    setSaving(false);
  };

  const handleToggleEnabled = async (newEnabled: boolean) => {
    if (newEnabled && !hasStoredCredentials) {
      toast.error('Please save credentials first');
      return;
    }

    setSaving(true);
    const { error } = await authFetch('/me/abrp/pull', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ abrp_pull_enabled: newEnabled }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error(error.message || 'Failed to update setting');
    } else {
      setEnabled(newEnabled);
      toast.success(newEnabled ? 'ABRP Pull enabled' : 'ABRP Pull disabled');
      fetchSettings();
    }
    setSaving(false);
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoveredVehicles([]);
    // Use the test endpoint without vehicle_ids to just discover
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
      // Auto-select vehicles that have telemetry
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

      // Update discovered vehicles with latest info if available
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
            <span className="font-semibold">ABRP Pull Integration</span>
            <TooltipInfo
              content={
                <>
                  <strong>Read vehicle data from ABRP</strong>
                  <br />
                  Use A Better Route Planner as an alternative vehicle data source.
                  Open browser dev tools (F12) on ABRP, go to Network tab, filter by
                  <code>iternio</code>, and copy values from the request.
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

        {/* How to get credentials - collapsible */}
        <details className="text-xs text-gray-500 border border-gray-200 rounded-lg">
          <summary className="cursor-pointer p-2 font-medium text-gray-700 hover:bg-gray-50">
            How to get these credentials
          </summary>
          <ol className="p-2 pt-0 space-y-1 list-decimal list-inside">
            <li>Log in to <strong>abetterrouteplanner.com</strong></li>
            <li>Open browser dev tools (F12) → <strong>Network</strong> tab</li>
            <li>Filter requests by <code>iternio</code></li>
            <li>Click any <code>get_tlm</code> request</li>
            <li><strong>API Key</strong>: from the <code>Authorization: APIKEY ...</code> header</li>
            <li><strong>Session ID</strong>: from the request body <code>session_id</code></li>
            <li><strong>Vehicle ID</strong>: from the request body <code>wakeup_vehicle_id</code></li>
          </ol>
        </details>

        {/* API Key Input */}
        <div className="space-y-2">
          <Label htmlFor="abrp-pull-apikey" className="text-sm text-gray-600">
            API Key
          </Label>
          <div className="relative">
            <Input
              id="abrp-pull-apikey"
              type={showApiKey ? 'text' : 'password'}
              placeholder={hasStoredCredentials && stats?.abrp_pull_api_key ? 'Saved (enter new to replace)' : 'From Authorization: APIKEY header'}
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

        {/* Session ID Input */}
        <div className="space-y-2">
          <Label htmlFor="abrp-pull-session" className="text-sm text-gray-600">
            Session ID
          </Label>
          <div className="relative">
            <Input
              id="abrp-pull-session"
              type={showSessionToken ? 'text' : 'password'}
              placeholder={hasStoredCredentials && stats?.abrp_pull_session_token ? 'Saved (enter new to replace)' : 'session_id from request body'}
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

        {/* Vehicle ID Input */}
        <div className="space-y-2">
          <Label htmlFor="abrp-pull-vids" className="text-sm text-gray-600">
            Vehicle ID
          </Label>
          <Input
            id="abrp-pull-vids"
            type="text"
            placeholder="wakeup_vehicle_id from request body"
            value={vehicleIdsInput}
            onChange={(e) => setVehicleIdsInput(e.target.value)}
          />
          <p className="text-xs text-gray-500">The numeric ID from the request body (e.g. 1007787500288)</p>
        </div>

        {/* Save / Clear Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSaveCredentials}
            disabled={saving || (!sessionTokenInput.trim() && !apiKeyInput.trim() && !vehicleIdsInput.trim())}
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
              Clear All
            </Button>
          )}
        </div>

        {/* Discover + Select Vehicles */}
        {hasStoredCredentials && (
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
        {hasStoredCredentials && (
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable ABRP Pull</Label>
              <p className="text-xs text-gray-500">
                Pull vehicle data from ABRP as an alternative data source
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
        {hasStoredCredentials && stats && totalPulls > 0 && (
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
        {hasStoredCredentials && (
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
