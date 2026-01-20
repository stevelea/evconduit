'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { UserDetails } from "@/types/userDetails";
import { FieldWithCopy } from "@/components/admin/user/FieldWithCopy";
import { useSupabase } from "@/lib/supabaseContext";

type Props = {
  user: UserDetails;
  loading: boolean;
  updateUserField: <K extends keyof UserDetails>(field: K, value: UserDetails[K]) => Promise<boolean>;
  onRefresh?: () => void;
};

export function UserDetailHeader({ user, loading, updateUserField, onRefresh }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ reachable: boolean; error?: string } | null>(null);
  const { supabase } = useSupabase();

  const handleSwitch = async (field: keyof UserDetails, value: boolean) => {
    setSaving(field);
    await updateUserField(field, value);
    setSaving(null);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const res = await fetch(`${apiUrl}/admin/users/${user.id}/check-ha-webhook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      setTestResult({ reachable: data.reachable, error: data.error });
      if (onRefresh) {
        onRefresh();
      }
    } catch {
      setTestResult({ reachable: false, error: 'Failed to test connection' });
    } finally {
      setTestingConnection(false);
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="h-8 w-40 mb-2 bg-indigo-100" />
        <Skeleton className="h-6 w-64 mb-2 bg-indigo-100" />
        <Skeleton className="h-6 w-52 mb-2 bg-indigo-100" />
      </div>
    );
  }

  return (
    <div className="max-w-9xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Vänster kolumn */}
        <div className="flex flex-col gap-6">
          <FieldWithCopy
            label="User ID"
            value={user.id ?? ""}
            className="w-full max-w-100"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input
              defaultValue={user.name ?? ""}
              className="w-full max-w-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="font-semibold text-gray-700">Approved:</label>
            <Switch
              checked={user.is_approved}
              onCheckedChange={val => handleSwitch("is_approved", val)}
              disabled={saving === "is_approved"}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="font-semibold text-gray-700">Notify Offline:</label>
            <Switch
              checked={user.notify_offline}
              onCheckedChange={val => handleSwitch("notify_offline", val)}
              disabled={saving === "notify_offline"}
            />
          </div>
        </div>
        {/* Höger kolumn */}
        <div className="flex flex-col gap-6">
          <FieldWithCopy
            label="Stripe Customer ID"
            value={user.stripe_customer_id ?? ""}
            className="w-full max-w-100"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              defaultValue={user.email}
              className="w-full max-w-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="font-semibold text-gray-700">Accepted Terms:</label>
            <Switch
              checked={!!user.accepted_terms}
              onCheckedChange={val => handleSwitch("accepted_terms", val)}
              disabled={saving === "accepted_terms"}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="font-semibold text-gray-700">Subscribed:</label>
            <Switch
              checked={user.is_subscribed}
              onCheckedChange={val => handleSwitch("is_subscribed", val)}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
            <Select
                value={user.tier ?? ""}
                onValueChange={val => updateUserField("tier", val as "free" | "pro")}
                disabled={saving === "tier"}
            >
                <SelectTrigger className="w-full max-w-100">
                <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {/* HA Webhook Status Section */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Home Assistant Webhook</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <label className="font-semibold text-gray-700">Status:</label>
            <span className={user.ha_webhook_id && user.ha_external_url ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
              {user.ha_webhook_id && user.ha_external_url ? 'Registered' : 'Not Registered'}
            </span>
          </div>
          {user.ha_webhook_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook ID</label>
              <Input
                value={user.ha_webhook_id}
                readOnly
                className="w-full max-w-100 bg-gray-50 font-mono text-xs"
              />
            </div>
          )}
          {user.ha_external_url && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">External URL</label>
              <Input
                value={user.ha_external_url}
                readOnly
                className="w-full bg-gray-50 font-mono text-xs"
              />
            </div>
          )}
        </div>

        {/* HA Webhook Stats */}
        {user.ha_webhook_id && user.ha_external_url && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-700 mb-3">Push Statistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Success Count</div>
                <div className="text-2xl font-bold text-green-600">{user.ha_push_success_count ?? 0}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Fail Count</div>
                <div className="text-2xl font-bold text-red-600">{user.ha_push_fail_count ?? 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Last Push</div>
                <div className="text-sm font-medium text-gray-800">{formatDateTime(user.ha_last_push_at)}</div>
              </div>
            </div>

            {/* URL Reachability */}
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-gray-700">URL Reachable:</label>
                {user.ha_url_reachable === null || user.ha_url_reachable === undefined ? (
                  <span className="text-gray-500 font-medium">Not checked</span>
                ) : user.ha_url_reachable ? (
                  <span className="text-green-600 font-medium">Yes</span>
                ) : (
                  <span className="text-red-600 font-medium">No</span>
                )}
              </div>
              {user.ha_last_check_at && (
                <div className="text-sm text-gray-500">
                  Last checked: {formatDateTime(user.ha_last_check_at)}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`mt-3 p-3 rounded-lg ${testResult.reachable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.reachable ? (
                  <span>Connection successful - URL is reachable</span>
                ) : (
                  <span>Connection failed{testResult.error ? `: ${testResult.error}` : ''}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
