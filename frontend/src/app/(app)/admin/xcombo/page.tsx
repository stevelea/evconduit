'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, Check, X, Trash2, ExternalLink, Pencil, Save, RefreshCw, Copy } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

type XComboEntry = {
  id: string;
  scene_id: string;
  xcombo_code: string | null;
  name: string;
  description: string | null;
  category: string | null;
  submitted_by: string | null;
  status: string;
  created_at: string;
};

export default function AdminXComboPage() {
  const { user, accessToken } = useAuth();
  const [entries, setEntries] = useState<XComboEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<XComboEntry>>({});
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);

    const res = await authFetch('/admin/xcombo/scenes', {
      method: 'GET',
      accessToken,
    });

    if (res.error) toast.error('Failed to load XCombo scenes');
    else setEntries(res.data || []);
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    if (user) fetchEntries();
  }, [user, fetchEntries]);

  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))] as string[];

  const startEdit = (entry: XComboEntry) => {
    setEditingId(entry.id);
    setEditFields({
      name: entry.name,
      xcombo_code: entry.xcombo_code,
      description: entry.description,
      category: entry.category,
      submitted_by: entry.submitted_by,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFields({});
  };

  const saveEdit = async () => {
    if (!accessToken || !editingId) return;
    setSaving(true);

    const res = await authFetch(`/admin/xcombo/scenes/${editingId}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(editFields),
    });

    if (res.error) {
      toast.error('Failed to save changes');
    } else {
      toast.success('Scene updated');
      setEditingId(null);
      setEditFields({});
      await fetchEntries();
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!accessToken) return;

    const res = await authFetch(`/admin/xcombo/scenes/${id}/status`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ status }),
    });

    if (res.error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Scene ${status}`);
      await fetchEntries();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!accessToken) return;
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    const res = await authFetch(`/admin/xcombo/scenes/${id}`, {
      method: 'DELETE',
      accessToken,
    });

    if (res.error) {
      toast.error('Failed to delete scene');
    } else {
      toast.success('Scene deleted');
      await fetchEntries();
    }
  };

  const handleRefresh = async () => {
    if (!accessToken) return;
    setRefreshing(true);
    const res = await authFetch('/admin/xcombo/refresh', {
      method: 'POST',
      accessToken,
    });
    if (res.error) {
      toast.error('Failed to refresh scenes');
    } else {
      const { updated, errors, total } = res.data;
      toast.success(`Refreshed ${updated}/${total} scenes${errors ? ` (${errors} errors)` : ''}`);
      await fetchEntries();
    }
    setRefreshing(false);
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter);
  const counts = {
    all: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    approved: entries.filter(e => e.status === 'approved').length,
    rejected: entries.filter(e => e.status === 'rejected').length,
  };

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-900">XCombo Scenes</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Refresh All
          </Button>
          <a
            href="/xcombo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
          >
            View public catalogue <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">({counts[status]})</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No scenes found.</p>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2">Scene ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Submitted By</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-gray-50">
                  {editingId === entry.id ? (
                    <>
                      <td className="px-4 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 font-mono text-xs text-gray-400 hover:text-gray-700"
                          title={entry.scene_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(entry.scene_id);
                            toast.success('Scene ID copied');
                          }}
                        >
                          {entry.scene_id.slice(0, 8)}...
                          <Copy className="h-3 w-3 ml-1" />
                        </Button>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editFields.name || ''}
                          onChange={(e) => setEditFields(f => ({ ...f, name: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editFields.xcombo_code || ''}
                          onChange={(e) => setEditFields(f => ({ ...f, xcombo_code: e.target.value }))}
                          className="h-8 text-sm font-mono w-24"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editFields.category || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              const newCat = prompt('Enter new category name:');
                              if (newCat) setEditFields(f => ({ ...f, category: newCat }));
                            } else {
                              setEditFields(f => ({ ...f, category: e.target.value || null }));
                            }
                          }}
                          className="h-8 rounded-md border border-gray-300 text-sm px-2 w-full"
                        >
                          <option value="">None</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="__new__">+ New category</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editFields.description || ''}
                          onChange={(e) => setEditFields(f => ({ ...f, description: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editFields.submitted_by || ''}
                          onChange={(e) => setEditFields(f => ({ ...f, submitted_by: e.target.value }))}
                          className="h-8 text-sm w-24"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={saveEdit}
                            disabled={saving}
                            title="Save"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            title="Cancel"
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 font-mono text-xs text-gray-400 hover:text-gray-700"
                          title={entry.scene_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(entry.scene_id);
                            toast.success('Scene ID copied');
                          }}
                        >
                          {entry.scene_id.slice(0, 8)}...
                          <Copy className="h-3 w-3 ml-1" />
                        </Button>
                      </td>
                      <td className="px-4 py-2 font-medium">{entry.name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">
                        {entry.xcombo_code || '—'}
                      </td>
                      <td className="px-4 py-2">{entry.category || '—'}</td>
                      <td className="px-4 py-2 max-w-xs truncate text-gray-600">
                        {entry.description || '—'}
                      </td>
                      <td className="px-4 py-2">{entry.submitted_by || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(entry)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          {entry.status !== 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(entry.id, 'approved')}
                              title="Approve"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {entry.status !== 'rejected' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(entry.id, 'rejected')}
                              title="Reject"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id, entry.name)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
