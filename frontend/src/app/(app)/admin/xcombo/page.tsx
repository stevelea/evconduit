'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, Check, X, Trash2, ExternalLink } from 'lucide-react';
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
        <a
          href="/xcombo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
        >
          View public catalog <ExternalLink className="h-3 w-3" />
        </a>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
