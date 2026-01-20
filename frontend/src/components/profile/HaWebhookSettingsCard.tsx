'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authFetch } from '@/lib/authFetch';
import WebhookInput from './WebhookInput';
import TooltipInfo from '../TooltipInfo';
import { CheckCircle, XCircle, Loader2, Activity, Wifi, WifiOff } from 'lucide-react';

interface HaWebhookSettingsCardProps {
  userId: string;
  accessToken: string;
}

interface WebhookStats {
  ha_webhook_id: string | null;
  ha_external_url: string | null;
  push_success_count: number;
  push_fail_count: number;
  last_push_at: string | null;
  last_check_at: string | null;
  url_reachable: boolean | null;
}

export default function HaWebhookSettingsCard({ userId, accessToken }: HaWebhookSettingsCardProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookId, setWebhookId] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [testing, setTesting] = useState(false);

  // Fetch webhook settings and stats
  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch settings
    const { data: settingsData } = await authFetch(`/user/${userId}/webhook`, {
      method: 'GET',
      accessToken,
    });

    if (settingsData) {
      setWebhookUrl(settingsData.ha_external_url ?? '');
      setWebhookId(settingsData.ha_webhook_id ?? '');
    }

    // Fetch stats
    const { data: statsData } = await authFetch(`/user/${userId}/webhook/stats`, {
      method: 'GET',
      accessToken,
    });

    if (statsData) {
      setStats(statsData);
    }

    setLoading(false);
  }, [userId, accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save to backend when field is blurred (onBlur)
  const handleSave = async (field: 'webhook_url' | 'webhook_id', value: string) => {
    if (field === 'webhook_url') setWebhookUrl(value);
    if (field === 'webhook_id') setWebhookId(value);

    const patchBody = {
      webhook_url: field === 'webhook_url' ? value : webhookUrl,
      webhook_id: field === 'webhook_id' ? value : webhookId,
    };

    const { error } = await authFetch(`/user/${userId}/webhook`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(patchBody),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) toast.error('Failed to save changes');
    else toast.success('Webhook updated!');
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!webhookUrl || !webhookId) {
      toast.error('Please enter both webhook URL and ID first');
      return;
    }

    setTesting(true);
    const { data, error } = await authFetch(`/user/${userId}/webhook/test`, {
      method: 'POST',
      accessToken,
    });

    if (error) {
      toast.error('Failed to test connection');
    } else if (data?.reachable) {
      toast.success('Connection successful!');
      // Refresh stats
      fetchData();
    } else {
      toast.error(data?.error || 'Connection failed');
      fetchData();
    }

    setTesting(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) return null;

  const isConfigured = webhookUrl && webhookId;
  const totalPushes = (stats?.push_success_count ?? 0) + (stats?.push_fail_count ?? 0);
  const successRate = totalPushes > 0
    ? Math.round((stats?.push_success_count ?? 0) / totalPushes * 100)
    : null;

  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold">Home Assistant Webhook</span>
          <TooltipInfo
            content={
              <>
                <strong>Home Assistant Webhook Settings</strong>
                <br />
                Configure the URL and ID for your Home Assistant webhook to receive real-time updates.
              </>
            }
            className="ml-1"
          />
        </div>

        <WebhookInput
          id="webhook-url"
          label="Webhook URL"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          onSave={(value) => handleSave('webhook_url', value)}
        />
        <WebhookInput
          id="webhook-id"
          label="Webhook ID"
          value={webhookId}
          onChange={(e) => setWebhookId(e.target.value)}
          onSave={(value) => handleSave('webhook_id', value)}
        />

        {/* Stats Section */}
        {isConfigured && stats && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-sm text-gray-700">Push Statistics</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {stats.url_reachable === true ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-green-700">Reachable</span>
                  </>
                ) : stats.url_reachable === false ? (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-red-700">Unreachable</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Not tested</span>
                  </>
                )}
              </div>

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

        {/* Test Connection Button */}
        {isConfigured && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
