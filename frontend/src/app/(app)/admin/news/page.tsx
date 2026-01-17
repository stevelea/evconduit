'use client';

import { useUserContext } from '@/contexts/UserContext';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface NewsData {
  content: string;
  enabled: boolean;
  updated_at?: string;
}

export default function AdminNewsPage() {
  const { mergedUser, loading, accessToken } = useUserContext();
  const [news, setNews] = useState<NewsData>({ content: '', enabled: false });
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      if (!accessToken || !mergedUser) {
        setDataLoading(false);
        return;
      }

      try {
        const { data, error } = await authFetch('/news/admin', {
          method: 'GET',
          accessToken,
        });

        if (error) {
          toast.error(`Failed to fetch news: ${error.message}`);
          return;
        }

        if (data) {
          setNews(data);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        toast.error('Failed to fetch news.');
      } finally {
        setDataLoading(false);
      }
    };

    if (accessToken && mergedUser && mergedUser.role === 'admin') {
      fetchNews();
    }
  }, [accessToken, mergedUser]);

  const handleSave = async () => {
    if (!accessToken) return;

    setSaving(true);
    try {
      const { error } = await authFetch('/news/admin', {
        method: 'PUT',
        accessToken,
        body: JSON.stringify({
          content: news.content,
          enabled: news.enabled,
        }),
      });

      if (error) {
        toast.error(`Failed to save news: ${error.message}`);
        return;
      }

      toast.success('News updated successfully!');
    } catch (error) {
      console.error('Error saving news:', error);
      toast.error('Failed to save news.');
    } finally {
      setSaving(false);
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
    <div className="container py-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Site News / Announcements</h1>
      <p className="text-gray-600 mb-6">
        This news box will be displayed on the landing page under the pricing plans.
      </p>

      {dataLoading ? (
        <p>Loading...</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edit News</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={news.enabled}
                onCheckedChange={(checked) =>
                  setNews((prev) => ({ ...prev, enabled: checked }))
                }
              />
              <Label htmlFor="enabled">Show news on landing page</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">News Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your news or announcement here..."
                value={news.content}
                onChange={(e) =>
                  setNews((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Supports plain text. Line breaks will be preserved.
              </p>
            </div>

            {news.updated_at && (
              <p className="text-xs text-gray-500">
                Last updated: {new Date(news.updated_at).toLocaleString()}
              </p>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save News'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {news.content && news.enabled && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Preview</h2>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📢</span>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">News</h3>
                  <p className="text-blue-800 text-sm whitespace-pre-wrap">
                    {news.content}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
