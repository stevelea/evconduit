'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';
import { Loader2 } from 'lucide-react';

type VendorUnlink = {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  vendor: string;
  deleted_vehicle_count: number;
};

export default function VendorUnlinksPage() {
  const { accessToken } = useAuth();
  const [unlinks, setUnlinks] = useState<VendorUnlink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    const fetchUnlinks = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch('/admin/vendor-unlinks', {
          method: 'GET',
          accessToken,
        });
        if (res.data) {
          setUnlinks(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch vendor unlinks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnlinks();
  }, [accessToken]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Vendor Unlink History</h1>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : unlinks.length === 0 ? (
        <p className="text-muted-foreground">No vendor unlinks recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">User</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Vendor</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Vehicles Deleted</th>
              </tr>
            </thead>
            <tbody>
              {unlinks.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-sm">{u.user_email}</div>
                    <div className="text-xs text-gray-400 font-mono">{u.user_id}</div>
                  </td>
                  <td className="px-4 py-2 font-medium">{u.vendor}</td>
                  <td className="px-4 py-2 text-center">{u.deleted_vehicle_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-muted-foreground mt-2">
        Showing {unlinks.length} unlink event{unlinks.length === 1 ? '' : 's'}
      </div>
    </main>
  );
}
