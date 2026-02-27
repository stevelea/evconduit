'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Trash2, Pencil, Save, X, Plus, Eye, EyeOff } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

const AVAILABLE_ICONS = [
  'Map', 'Zap', 'MessageCircle', 'Bot', 'ExternalLink', 'Globe',
  'Link2', 'BookOpen', 'Star', 'Heart', 'Gift', 'Coffee',
  'Car', 'Wrench', 'Shield', 'Bell', 'Mail', 'Phone',
];

type UsefulLink = {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  is_external: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export default function AdminUsefulLinksPage() {
  const { user, accessToken } = useAuth();
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<UsefulLink>>({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLink, setNewLink] = useState({ label: '', url: '', icon: '', is_external: false, sort_order: 0 });
  const [adding, setAdding] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    const res = await authFetch('/admin/useful-links', { method: 'GET', accessToken });
    if (res.error) toast.error('Failed to load useful links');
    else setLinks(res.data || []);
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    if (user) fetchLinks();
  }, [user, fetchLinks]);

  const startEdit = (link: UsefulLink) => {
    setEditingId(link.id);
    setEditFields({
      label: link.label,
      url: link.url,
      icon: link.icon,
      is_external: link.is_external,
      is_active: link.is_active,
      sort_order: link.sort_order,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFields({});
  };

  const saveEdit = async () => {
    if (!accessToken || !editingId) return;
    setSaving(true);
    const res = await authFetch(`/admin/useful-links/${editingId}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(editFields),
    });
    if (res.error) {
      toast.error('Failed to save changes');
    } else {
      toast.success('Link updated');
      setEditingId(null);
      setEditFields({});
      await fetchLinks();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, label: string) => {
    if (!accessToken) return;
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    const res = await authFetch(`/admin/useful-links/${id}`, { method: 'DELETE', accessToken });
    if (res.error) toast.error('Failed to delete link');
    else {
      toast.success('Link deleted');
      await fetchLinks();
    }
  };

  const handleToggleActive = async (link: UsefulLink) => {
    if (!accessToken) return;
    const res = await authFetch(`/admin/useful-links/${link.id}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ is_active: !link.is_active }),
    });
    if (res.error) toast.error('Failed to toggle link');
    else {
      toast.success(link.is_active ? 'Link hidden' : 'Link visible');
      await fetchLinks();
    }
  };

  const handleAdd = async () => {
    if (!accessToken) return;
    if (!newLink.label || !newLink.url) {
      toast.error('Label and URL are required');
      return;
    }
    setAdding(true);
    const res = await authFetch('/admin/useful-links', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(newLink),
    });
    if (res.error) {
      toast.error('Failed to create link');
    } else {
      toast.success('Link created');
      setNewLink({ label: '', url: '', icon: '', is_external: false, sort_order: 0 });
      setShowAdd(false);
      await fetchLinks();
    }
    setAdding(false);
  };

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-indigo-900">Useful Links</h1>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Link
        </Button>
      </div>

      {showAdd && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">New Link</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              placeholder="Label"
              value={newLink.label}
              onChange={(e) => setNewLink(f => ({ ...f, label: e.target.value }))}
            />
            <Input
              placeholder="URL"
              value={newLink.url}
              onChange={(e) => setNewLink(f => ({ ...f, url: e.target.value }))}
            />
            <select
              value={newLink.icon}
              onChange={(e) => setNewLink(f => ({ ...f, icon: e.target.value }))}
              className="h-10 rounded-md border border-gray-300 text-sm px-2"
            >
              <option value="">No icon</option>
              {AVAILABLE_ICONS.map(icon => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Sort order"
              value={newLink.sort_order}
              onChange={(e) => setNewLink(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newLink.is_external}
                onChange={(e) => setNewLink(f => ({ ...f, is_external: e.target.checked }))}
              />
              External link (new tab)
            </label>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : links.length === 0 ? (
        <p className="text-gray-500">No links found.</p>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Label</th>
                <th className="px-4 py-2">URL</th>
                <th className="px-4 py-2">Icon</th>
                <th className="px-4 py-2">External</th>
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-t hover:bg-gray-50">
                  {editingId === link.id ? (
                    <>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={editFields.sort_order ?? 0}
                          onChange={(e) => setEditFields(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                          className="h-8 text-sm w-16"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editFields.label || ''}
                          onChange={(e) => setEditFields(f => ({ ...f, label: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editFields.url || ''}
                          onChange={(e) => setEditFields(f => ({ ...f, url: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editFields.icon || ''}
                          onChange={(e) => setEditFields(f => ({ ...f, icon: e.target.value || null }))}
                          className="h-8 rounded-md border border-gray-300 text-sm px-2"
                        >
                          <option value="">None</option>
                          {AVAILABLE_ICONS.map(icon => (
                            <option key={icon} value={icon}>{icon}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={editFields.is_external ?? false}
                          onChange={(e) => setEditFields(f => ({ ...f, is_external: e.target.checked }))}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={editFields.is_active ?? true}
                          onChange={(e) => setEditFields(f => ({ ...f, is_active: e.target.checked }))}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={saveEdit} disabled={saving} title="Save">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit} title="Cancel">
                            <X className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-gray-500">{link.sort_order}</td>
                      <td className="px-4 py-2 font-medium">{link.label}</td>
                      <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{link.url}</td>
                      <td className="px-4 py-2 text-gray-500">{link.icon || '—'}</td>
                      <td className="px-4 py-2">{link.is_external ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          link.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {link.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(link)} title="Edit">
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(link)} title={link.is_active ? 'Hide' : 'Show'}>
                            {link.is_active ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-green-600" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(link.id, link.label)} title="Delete">
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
