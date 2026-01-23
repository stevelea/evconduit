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
import { CheckCircle, XCircle, Loader2, Activity, Navigation, ExternalLink, Eye, EyeOff } from 'lucide-react';

interface AbrpSettingsCardProps {
  userId: string;
  accessToken: string;
}

interface AbrpStats {
  abrp_enabled: boolean;
  abrp_token: string | null;
  last_push_at: string | null;
  push_success_count: number;
  push_fail_count: number;
  last_error: string | null;
}

export default function AbrpSettingsCard({ userId, accessToken }: AbrpSettingsCardProps) {
  // Keep userId in props for consistency with other profile cards, even though we use /me endpoints
  void userId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [stats, setStats] = useState<AbrpStats | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [hasStoredToken, setHasStoredToken] = useState(false);

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await authFetch('/me/abrp', {
      method: 'GET',
      accessToken,
    });

    if (data && !error) {
      setStats(data);
      setEnabled(data.abrp_enabled ?? false);
      setHasStoredToken(!!data.abrp_token);
      // Don't populate the input with masked token
      setTokenInput('');
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save token
  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      toast.error('Please enter a token');
      return;
    }

    setSaving(true);
    const { error } = await authFetch('/me/abrp', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ abrp_token: tokenInput }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error(error.message || 'Failed to save token');
    } else {
      toast.success('ABRP token saved!');
      setTokenInput('');
      fetchSettings();
    }
    setSaving(false);
  };

  // Clear token
  const handleClearToken = async () => {
    setSaving(true);
    const { error } = await authFetch('/me/abrp', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ abrp_token: '', abrp_enabled: false }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error('Failed to clear token');
    } else {
      toast.success('ABRP token cleared');
      setTokenInput('');
      setEnabled(false);
      fetchSettings();
    }
    setSaving(false);
  };

  // Toggle enabled
  const handleToggleEnabled = async (newEnabled: boolean) => {
    if (newEnabled && !hasStoredToken) {
      toast.error('Please save a token first');
      return;
    }

    setSaving(true);
    const { error } = await authFetch('/me/abrp', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ abrp_enabled: newEnabled }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error(error.message || 'Failed to update setting');
    } else {
      setEnabled(newEnabled);
      toast.success(newEnabled ? 'ABRP enabled' : 'ABRP disabled');
      fetchSettings();
    }
    setSaving(false);
  };

  // Test connection
  const handleTest = async () => {
    setTesting(true);
    const { data, error } = await authFetch('/me/abrp/test', {
      method: 'POST',
      accessToken,
    });

    if (error) {
      toast.error(error.message || 'Test failed');
    } else if (data?.success) {
      toast.success('Test telemetry sent to ABRP!');
      fetchSettings();
    } else {
      toast.error(data?.message || 'Test failed');
    }
    setTesting(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) return null;

  const totalPushes = (stats?.push_success_count ?? 0) + (stats?.push_fail_count ?? 0);
  const successRate = totalPushes > 0
    ? Math.round((stats?.push_success_count ?? 0) / totalPushes * 100)
    : null;

  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold">ABRP Integration</span>
            <TooltipInfo
              content={
                <>
                  <strong>A Better Route Planner</strong>
                  <br />
                  Connect your vehicle to ABRP for real-time route planning with live battery data.
                  Get your token from the ABRP app settings.
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
            Get ABRP <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Token Input */}
        <div className="space-y-2">
          <Label htmlFor="abrp-token" className="text-sm text-gray-600">
            ABRP Token
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="abrp-token"
                type={showToken ? 'text' : 'password'}
                placeholder={hasStoredToken ? 'Token saved (enter new to replace)' : 'Enter your ABRP token'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handleSaveToken}
              disabled={saving || !tokenInput.trim()}
              size="sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          {hasStoredToken && (
            <p className="text-xs text-gray-500">
              Current token: {stats?.abrp_token}
              <button
                onClick={handleClearToken}
                className="ml-2 text-red-500 hover:text-red-700 underline"
                disabled={saving}
              >
                Clear
              </button>
            </p>
          )}
        </div>

        {/* Enable Toggle */}
        {hasStoredToken && (
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable ABRP Updates</Label>
              <p className="text-xs text-gray-500">
                Automatically send vehicle data to ABRP when updates arrive
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
        {hasStoredToken && stats && totalPushes > 0 && (
          <div className="mt-2 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-sm text-gray-700">Push Statistics</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Success Rate */}
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
                  <span className="text-gray-500">No pushes yet</span>
                )}
              </div>

              {/* Last Error */}
              {stats.last_error && (
                <div className="text-red-600 text-xs">
                  Error: {stats.last_error}
                </div>
              )}

              {/* Push Counts */}
              <div className="text-gray-600">
                <span className="text-green-600 font-medium">{stats.push_success_count}</span> successful
              </div>
              <div className="text-gray-600">
                <span className="text-red-600 font-medium">{stats.push_fail_count}</span> failed
              </div>

              {/* Last Push */}
              <div className="col-span-2 text-gray-500 text-xs">
                Last push: {formatDate(stats.last_push_at)}
              </div>
            </div>
          </div>
        )}

        {/* Test Button */}
        {hasStoredToken && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || !enabled}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Send Test Telemetry
                </>
              )}
            </Button>
            {!enabled && hasStoredToken && (
              <p className="text-xs text-gray-500 mt-1 text-center">
                Enable ABRP updates to test
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
