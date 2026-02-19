'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Pencil, Trash, TestTube, Server, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { authFetch } from '@/lib/authFetch';

type EnodeAccount = {
  id: string;
  name: string;
  client_id: string;
  client_secret: string;
  webhook_secret: string | null;
  base_url: string;
  auth_url: string;
  webhook_url: string | null;
  redirect_uri: string | null;
  max_vehicles: number;
  is_active: boolean;
  created_at: string;
  notes: string | null;
  user_count: number;
  vehicle_count: number;
};

const emptyForm = {
  name: '',
  client_id: '',
  client_secret: '',
  webhook_secret: '',
  base_url: 'https://enode-api.production.enode.io',
  auth_url: 'https://oauth.production.enode.io/oauth2/token',
  webhook_url: '',
  redirect_uri: '',
  max_vehicles: 4,
  is_active: true,
  notes: '',
};

export default function EnodeAccountsPage() {
  const { user, accessToken } = useAuth();
  const [accounts, setAccounts] = useState<EnodeAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [infoLoadingId, setInfoLoadingId] = useState<string | null>(null);
  const [infoData, setInfoData] = useState<{
    accountName: string;
    user_count: number;
    vehicle_count: number;
    webhook_count: number;
    webhooks: { id: string; url: string; events: string[] }[];
  } | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await authFetch('/admin/enode-accounts', { method: 'GET', accessToken });
      if (res.error) {
        toast.error('Failed to fetch accounts');
        return;
      }
      setAccounts(res.data || []);
    } catch {
      toast.error('Could not load accounts');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user, fetchAccounts]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (account: EnodeAccount) => {
    setEditingId(account.id);
    setForm({
      name: account.name || '',
      client_id: account.client_id || '',
      client_secret: '', // Don't prefill masked secret
      webhook_secret: '',
      base_url: account.base_url || '',
      auth_url: account.auth_url || '',
      webhook_url: account.webhook_url || '',
      redirect_uri: account.redirect_uri || '',
      max_vehicles: account.max_vehicles,
      is_active: account.is_active,
      notes: account.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      // Don't send empty secrets on update
      if (editingId) {
        if (!body.client_secret) delete body.client_secret;
        if (!body.webhook_secret) delete body.webhook_secret;
      }

      const url = editingId ? `/admin/enode-accounts/${editingId}` : '/admin/enode-accounts';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        accessToken,
        body: JSON.stringify(body),
      });

      if (res.error) {
        toast.error(res.error.message || 'Failed to save account');
      } else {
        toast.success(editingId ? 'Account updated' : 'Account created');
        setShowForm(false);
        fetchAccounts();
      }
    } catch {
      toast.error('Could not save account');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (accountId: string) => {
    if (!accessToken) return;
    setTestingId(accountId);
    try {
      const res = await authFetch(`/admin/enode-accounts/${accountId}/test`, {
        method: 'POST',
        accessToken,
      });
      if (res.data?.success) {
        toast.success('Credentials are valid');
      } else {
        toast.error(res.data?.message || 'Credential test failed');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!accessToken) return;
    setDeletingId(accountId);
    try {
      const res = await authFetch(`/admin/enode-accounts/${accountId}`, {
        method: 'DELETE',
        accessToken,
      });
      if (res.error) {
        toast.error(res.error.message || 'Failed to delete account');
      } else {
        toast.success('Account deleted');
        fetchAccounts();
      }
    } catch {
      toast.error('Could not delete account');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInfo = async (account: EnodeAccount) => {
    if (!accessToken) return;
    setInfoLoadingId(account.id);
    try {
      const res = await authFetch(`/admin/enode-accounts/${account.id}/info`, {
        method: 'POST',
        accessToken,
      });
      if (res.data?.success) {
        setInfoData({ accountName: account.name, ...res.data });
        setShowInfo(true);
      } else {
        toast.error(res.data?.message || 'Failed to get account info');
      }
    } catch {
      toast.error('Could not fetch account info');
    } finally {
      setInfoLoadingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-indigo-700">Enode Accounts</h1>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <Button onClick={fetchAccounts} disabled={loading} variant="outline">
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Refresh'}
          </Button>
          <Button onClick={openCreateForm}>
            <Plus className="w-4 h-4 mr-1" />
            Add Account
          </Button>
        </div>
      </header>

      {/* Account Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {accounts.map((account) => {
          const remaining = account.max_vehicles - account.vehicle_count;
          const capacityPct = account.max_vehicles > 0
            ? Math.round((account.vehicle_count / account.max_vehicles) * 100)
            : 0;

          return (
            <Card key={account.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-lg">{account.name}</h3>
                  {account.is_active ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Inactive</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleInfo(account)}
                    disabled={infoLoadingId === account.id}
                    title="Query Enode API stats"
                  >
                    {infoLoadingId === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleTest(account.id)}
                    disabled={testingId === account.id}
                    title="Test credentials"
                  >
                    {testingId === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEditForm(account)} title="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(account.id)}
                    disabled={deletingId === account.id || account.user_count > 0}
                    title={account.user_count > 0 ? 'Cannot delete: users assigned' : 'Delete'}
                    className="text-red-500 hover:text-red-700"
                  >
                    {deletingId === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Vehicles: {account.vehicle_count} / {account.max_vehicles}</span>
                  <span>{remaining} remaining</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      capacityPct >= 90 ? 'bg-red-500' : capacityPct >= 70 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(capacityPct, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div><strong>Users:</strong> {account.user_count}</div>
                <div><strong>Client ID:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{account.client_id}</code></div>
                <div><strong>Base URL:</strong> <code className="text-xs bg-gray-100 px-1 rounded">{account.base_url}</code></div>
                {account.notes && (
                  <div><strong>Notes:</strong> {account.notes}</div>
                )}
              </div>
            </Card>
          );
        })}

        {!loading && accounts.length === 0 && (
          <div className="col-span-2 text-center text-gray-500 py-8">
            No Enode accounts configured. Click &quot;Add Account&quot; to create one.
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Enode Account' : 'New Enode Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Production Account 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID *</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret *{editingId && ' (leave blank to keep current)'}
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                type="password"
                value={form.client_secret}
                onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret{editingId && ' (leave blank to keep current)'}
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                type="password"
                value={form.webhook_secret}
                onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL *</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth URL *</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                value={form.auth_url}
                onChange={(e) => setForm({ ...form, auth_url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                value={form.webhook_url}
                onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URI</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                value={form.redirect_uri}
                onChange={(e) => setForm({ ...form, redirect_uri: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Vehicles</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  type="number"
                  min={1}
                  value={form.max_vehicles}
                  onChange={(e) => setForm({ ...form, max_vehicles: parseInt(e.target.value) || 4 })}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="text-sm font-medium text-gray-700">Active</label>
                <button
                  type="button"
                  className={`w-10 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                      form.is_active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : null}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enode API Stats: {infoData?.accountName}</DialogTitle>
          </DialogHeader>
          {infoData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-700">{infoData.user_count}</div>
                  <div className="text-xs text-gray-600">Users</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{infoData.vehicle_count}</div>
                  <div className="text-xs text-gray-600">Vehicles</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-700">{infoData.webhook_count}</div>
                  <div className="text-xs text-gray-600">Webhooks</div>
                </div>
              </div>
              {infoData.webhooks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Webhook Subscriptions</h4>
                  <div className="space-y-2">
                    {infoData.webhooks.map((wh) => (
                      <div key={wh.id} className="text-xs bg-gray-50 rounded p-2">
                        <div className="font-mono text-gray-600 truncate">{wh.url}</div>
                        <div className="text-gray-400 mt-1">{wh.events.join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
