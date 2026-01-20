'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Bell, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/authFetch';
import { useAuth } from '@/hooks/useAuth';

interface PushoverEvents {
  charge_complete: boolean;
  charge_started: boolean;
  vehicle_offline: boolean;
  vehicle_online: boolean;
}

interface PushoverSettingsData {
  pushover_enabled: boolean;
  pushover_user_key: string | null;
  pushover_events: PushoverEvents;
}

const DEFAULT_EVENTS: PushoverEvents = {
  charge_complete: true,
  charge_started: false,
  vehicle_offline: false,
  vehicle_online: false,
};

export function PushoverSettings() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [validating, setValidating] = useState(false);

  const [settings, setSettings] = useState<PushoverSettingsData>({
    pushover_enabled: false,
    pushover_user_key: null,
    pushover_events: DEFAULT_EVENTS,
  });

  const [userKeyInput, setUserKeyInput] = useState('');
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!accessToken) return;
      try {
        const res = await authFetch('/me/pushover', { method: 'GET', accessToken });
        if (!res.error && res.data) {
          setSettings({
            pushover_enabled: res.data.pushover_enabled || false,
            pushover_user_key: res.data.pushover_user_key || null,
            pushover_events: res.data.pushover_events || DEFAULT_EVENTS,
          });
          if (res.data.pushover_user_key) {
            setIsKeyValid(true);
          }
        }
      } catch {
        toast.error('Failed to load Pushover settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [accessToken]);

  const validateKey = async () => {
    if (!userKeyInput.trim()) {
      toast.error('Please enter your Pushover User Key');
      return;
    }
    if (!accessToken) return;
    setValidating(true);
    try {
      const res = await authFetch('/me/pushover/validate', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ user_key: userKeyInput.trim() }),
      });
      if (!res.error) {
        setIsKeyValid(true);
        toast.success('User key is valid!');
      } else {
        setIsKeyValid(false);
        toast.error(res.error?.message || 'Invalid user key');
      }
    } catch {
      setIsKeyValid(false);
      toast.error('Failed to validate user key');
    } finally {
      setValidating(false);
    }
  };

  const saveSettings = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        pushover_events: settings.pushover_events,
        pushover_enabled: settings.pushover_enabled,
      };

      // Only include user key if it's being changed
      if (userKeyInput.trim() && isKeyValid) {
        payload.pushover_user_key = userKeyInput.trim();
      }

      const res = await authFetch('/me/pushover', {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify(payload),
      });

      if (!res.error) {
        toast.success('Pushover settings saved');
        // Update the masked key display
        if (userKeyInput.trim() && isKeyValid) {
          setSettings(prev => ({
            ...prev,
            pushover_user_key: `${'*'.repeat(userKeyInput.length - 4)}${userKeyInput.slice(-4)}`,
          }));
          setUserKeyInput('');
        }
      } else {
        toast.error(res.error?.message || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    if (!accessToken) return;
    setTesting(true);
    try {
      const res = await authFetch('/me/pushover/test', {
        method: 'POST',
        accessToken,
      });
      if (!res.error) {
        toast.success('Test notification sent! Check your device.');
      } else {
        toast.error(res.error?.message || 'Failed to send test notification');
      }
    } catch {
      toast.error('Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  const toggleEvent = (event: keyof PushoverEvents) => {
    setSettings(prev => ({
      ...prev,
      pushover_events: {
        ...prev.pushover_events,
        [event]: !prev.pushover_events[event],
      },
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Pushover Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Pushover Notifications
        </CardTitle>
        <CardDescription>
          Get instant push notifications on your phone when charging events occur.{' '}
          <a
            href="https://pushover.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline inline-flex items-center gap-1"
          >
            Get Pushover <ExternalLink className="w-3 h-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Key Input */}
        <div className="space-y-2">
          <Label htmlFor="pushover-key">Pushover User Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="pushover-key"
                type="text"
                placeholder={settings.pushover_user_key || 'Enter your Pushover User Key'}
                value={userKeyInput}
                onChange={(e) => {
                  setUserKeyInput(e.target.value);
                  setIsKeyValid(null);
                }}
                className="pr-10"
              />
              {isKeyValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isKeyValid ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={validateKey}
              disabled={validating || !userKeyInput.trim()}
            >
              {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Find your User Key at{' '}
            <a
              href="https://pushover.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              pushover.net
            </a>{' '}
            after logging in.
          </p>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Pushover Notifications</Label>
            <p className="text-xs text-gray-500">Turn on/off all Pushover notifications</p>
          </div>
          <Switch
            checked={settings.pushover_enabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushover_enabled: checked }))}
            disabled={!settings.pushover_user_key && !isKeyValid}
          />
        </div>

        {/* Event Toggles */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-medium">Notification Events</Label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Charging Complete</Label>
                <p className="text-xs text-gray-500">When your vehicle finishes charging</p>
              </div>
              <Switch
                checked={settings.pushover_events.charge_complete}
                onCheckedChange={() => toggleEvent('charge_complete')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Charging Started</Label>
                <p className="text-xs text-gray-500">When your vehicle starts charging</p>
              </div>
              <Switch
                checked={settings.pushover_events.charge_started}
                onCheckedChange={() => toggleEvent('charge_started')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Vehicle Offline</Label>
                <p className="text-xs text-gray-500">When your vehicle becomes unreachable</p>
              </div>
              <Switch
                checked={settings.pushover_events.vehicle_offline}
                onCheckedChange={() => toggleEvent('vehicle_offline')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Vehicle Online</Label>
                <p className="text-xs text-gray-500">When your vehicle becomes reachable again</p>
              </div>
              <Switch
                checked={settings.pushover_events.vehicle_online}
                onCheckedChange={() => toggleEvent('vehicle_online')}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={sendTestNotification}
            disabled={testing || !settings.pushover_user_key}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Test'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
