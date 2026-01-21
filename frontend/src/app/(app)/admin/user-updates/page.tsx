'use client';

import { useUserContext } from '@/contexts/UserContext';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

interface UserUpdate {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface UpdateFormData {
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
}

const defaultFormData: UpdateFormData = {
  title: '',
  content: '',
  is_active: true,
  priority: 0,
};

export default function AdminUserUpdatesPage() {
  const { mergedUser, loading, accessToken } = useUserContext();
  const [updates, setUpdates] = useState<UserUpdate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateFormData>(defaultFormData);

  const fetchUpdates = async () => {
    if (!accessToken || !mergedUser) {
      setDataLoading(false);
      return;
    }

    try {
      const { data, error } = await authFetch('/user-updates/admin', {
        method: 'GET',
        accessToken,
      });

      if (error) {
        toast.error(`Failed to fetch updates: ${error.message}`);
        return;
      }

      if (data) {
        setUpdates(data);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast.error('Failed to fetch updates.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && mergedUser && mergedUser.role === 'admin') {
      fetchUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, mergedUser]);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (update: UserUpdate) => {
    setEditingId(update.id);
    setFormData({
      title: update.title,
      content: update.content,
      is_active: update.is_active,
      priority: update.priority,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!accessToken) return;
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/user-updates/admin/${editingId}`
        : '/user-updates/admin';
      const method = editingId ? 'PUT' : 'POST';

      const { error } = await authFetch(url, {
        method,
        accessToken,
        body: JSON.stringify(formData),
      });

      if (error) {
        toast.error(`Failed to save: ${error.message}`);
        return;
      }

      toast.success(editingId ? 'Update saved!' : 'Update created!');
      setDialogOpen(false);
      fetchUpdates();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm('Are you sure you want to delete this update?')) return;

    try {
      const { error } = await authFetch(`/user-updates/admin/${id}`, {
        method: 'DELETE',
        accessToken,
      });

      if (error) {
        toast.error(`Failed to delete: ${error.message}`);
        return;
      }

      toast.success('Update deleted');
      fetchUpdates();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete.');
    }
  };

  const handleToggleActive = async (update: UserUpdate) => {
    if (!accessToken) return;

    try {
      const { error } = await authFetch(`/user-updates/admin/${update.id}`, {
        method: 'PUT',
        accessToken,
        body: JSON.stringify({ is_active: !update.is_active }),
      });

      if (error) {
        toast.error(`Failed to update: ${error.message}`);
        return;
      }

      fetchUpdates();
    } catch (error) {
      console.error('Error toggling:', error);
    }
  };

  if (loading || !mergedUser) {
    return (
      <div className="container py-4">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container py-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Updates</h1>
          <p className="text-gray-600">
            Manage news/updates shown on user dashboards.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Update
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Update' : 'Create Update'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. New Feature Available"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="The update message..."
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    className="w-20"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Higher priority updates appear first. Active updates are visible to users.
              </p>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Update'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {dataLoading ? (
        <p>Loading updates...</p>
      ) : updates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No updates yet. Click &quot;Add Update&quot; to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {updates.map((update) => (
            <Card
              key={update.id}
              className={!update.is_active ? 'opacity-60' : ''}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="text-gray-400 mt-1">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{update.title}</h3>
                      {!update.is_active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Priority: {update.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-2">
                      {update.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated: {new Date(update.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={update.is_active}
                      onCheckedChange={() => handleToggleActive(update)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(update)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(update.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview */}
      {updates.filter((u) => u.is_active).length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Dashboard Preview</h2>
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {updates
                .filter((u) => u.is_active)
                .map((update) => (
                  <div key={update.id} className="border-l-2 border-blue-300 pl-3">
                    <h4 className="font-medium text-blue-900 text-sm">
                      {update.title}
                    </h4>
                    <p className="text-blue-800 text-sm whitespace-pre-wrap">
                      {update.content}
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
