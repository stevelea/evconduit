'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Trash, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { authFetch } from '@/lib/authFetch';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type UserVehicle = {
  vehicle_id: string;
  vendor: string;
};

type AdminUserView = {
  id: string;
  full_name?: string;
  email: string;
  is_admin: boolean;
  linked_to_enode: boolean;
  linked_at?: string | null;
  is_approved: boolean;
  tier: string;
  api_calls_30d: number;
  vehicles: UserVehicle[];
  vehicle_count: number;
  country_code?: string | null;
};

// Convert country code to flag emoji
function countryCodeToFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

type SortKey = 'full_name' | 'email' | 'tier' | 'api_calls_30d' | 'vehicle_count' | 'linked_at' | 'is_approved';
type SortDirection = 'asc' | 'desc';

export default function UserAdminPage() {
  const { user, accessToken } = useAuth();
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('linked_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let aVal: string | number | boolean | null = null;
      let bVal: string | number | boolean | null = null;

      switch (sortKey) {
        case 'full_name':
          aVal = a.full_name?.toLowerCase() || '';
          bVal = b.full_name?.toLowerCase() || '';
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'tier':
          aVal = a.tier;
          bVal = b.tier;
          break;
        case 'api_calls_30d':
          aVal = a.api_calls_30d;
          bVal = b.api_calls_30d;
          break;
        case 'vehicle_count':
          aVal = a.vehicle_count;
          bVal = b.vehicle_count;
          break;
        case 'linked_at':
          aVal = a.linked_at || '';
          bVal = b.linked_at || '';
          break;
        case 'is_approved':
          aVal = a.is_approved ? 1 : 0;
          bVal = b.is_approved ? 1 : 0;
          break;
      }

      if (aVal === null || bVal === null) return 0;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortKey, sortDirection]);

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await authFetch('/admin/users', { method: 'GET', accessToken });
      if (res.error) {
        toast.error('Failed to fetch users');
        return;
      }
      setUsers(res.data || []);
    } catch {
      toast.error('Could not load users');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (user) fetchUsers();
  }, [user, fetchUsers]);

  const handleToggleApproval = async (userId: string, isApproved: boolean) => {
    if (!accessToken) return;
    try {
      const res = await authFetch(`/admin/users/${userId}/approve`, {
        method: 'PATCH',
        accessToken,
        body: JSON.stringify({ is_approved: isApproved }),
      });
      if (res.error) {
        toast.error('Failed to update approval');
      } else {
        toast.success('Approval status updated');
        fetchUsers();
      }
    } catch {
      toast.error('Could not update approval');
    }
  };

  const confirmAndDelete = async () => {
    if (!confirmDeleteId || !accessToken) return;
    setLoading(true);
    try {
      const res = await authFetch(`/admin/users/${confirmDeleteId}`, { method: 'DELETE', accessToken });
      if (res.error) {
        toast.error('Failed to delete user');
      } else {
        toast.success('User deleted');
        fetchUsers();
      }
    } catch {
      toast.error('Could not delete user');
    } finally {
      setConfirmDeleteId(null);
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold text-indigo-700">User Admin</h1>
        <Button onClick={fetchUsers} disabled={loading} className="mt-2 lg:mt-0">
          {loading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />Refreshing...</> : 'Refresh'}
        </Button>
      </header>

      {/* Desktop Table */}
      <Card className="hidden lg:block overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
              <SortHeader label="Name" sortKeyName="full_name" />
              <SortHeader label="Email" sortKeyName="email" />
              <SortHeader label="Tier" sortKeyName="tier" />
              <SortHeader label="API Calls (30d)" sortKeyName="api_calls_30d" />
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Enode Connected</th>
              <SortHeader label="Vehicles" sortKeyName="vehicle_count" />
              <SortHeader label="Connected At" sortKeyName="linked_at" />
              <SortHeader label="Approved" sortKeyName="is_approved" />
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              // Skeleton rows for desktop
              [...Array(3)].map((_, idx) => (
                <tr key={idx}>
                  {Array.from({ length: 11 }).map((__, cIdx) => (
                    <td key={cIdx} className="px-4 py-2">
                      <Skeleton className="h-6 w-full bg-indigo-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <>
                {sortedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <Tooltip>
                        <TooltipTrigger>
                          {`${u.id.slice(0, 8)}...`}
                        </TooltipTrigger>
                        <TooltipContent>
                          <pre className="text-xs text-white">{u.id}</pre>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{countryCodeToFlag(u.country_code)} {u.full_name ?? '–'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">{u.tier}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{u.api_calls_30d.toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{u.is_admin ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{u.linked_to_enode ? '✓' : '✗'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {u.vehicles && u.vehicles.length > 0 ? (
                        <div className="space-y-1">
                          {u.vehicles.map((v) => (
                            <Tooltip key={v.vehicle_id}>
                              <TooltipTrigger>
                                <span className="inline-block px-2 py-1 bg-indigo-100 rounded text-xs">
                                  {v.vendor} ({v.vehicle_id.slice(0, 8)}...)
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <pre className="text-xs text-white">{v.vehicle_id}</pre>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">–</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{u.linked_at ? new Date(u.linked_at).toLocaleString() : '–'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <Switch checked={u.is_approved} onCheckedChange={val => handleToggleApproval(u.id, val)} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <Button size="icon" variant="destructive" onClick={() => setConfirmDeleteId(u.id)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-center"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {!loading && sortedUsers.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-center text-sm text-gray-500">No users found.</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </Card>

      {/* Mobile Cards */}
      <div className="space-y-4 lg:hidden">
        {loading ? (
          // Skeleton cards for mobile
          [...Array(3)].map((_, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex justify-between items-center mb-2">
                <Skeleton className="h-6 w-1/3 bg-indigo-100" />
                <Skeleton className="h-8 w-8 rounded-full bg-indigo-100" />
              </div>
              <div className="space-y-1 text-sm text-gray-700">
                <Skeleton className="h-4 w-1/2 mb-1 bg-indigo-100" />
                <Skeleton className="h-4 w-1/2 mb-1 bg-indigo-100" />
                <Skeleton className="h-4 w-1/3 mb-1 bg-indigo-100" />
                <Skeleton className="h-4 w-1/3 mb-1 bg-indigo-100" />
                <Skeleton className="h-4 w-1/3 mb-1 bg-indigo-100" />
                <Skeleton className="h-5 w-1/3 mt-2 bg-indigo-100" />
              </div>
            </Card>
          ))
        ) : (
          <>
            {sortedUsers.map(u => (
              <Card key={u.id} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold text-gray-900">
                    <Tooltip>
                      <TooltipTrigger>
                        {countryCodeToFlag(u.country_code)} {u.full_name ?? u.email}
                      </TooltipTrigger>
                      <TooltipContent>
                        <pre className="text-xs text-gray-700">{u.id}</pre>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="secondary" onClick={() => setConfirmDeleteId(u.id)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
                      <p>Delete user {u.email}?</p>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmAndDelete}>Delete</Button>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-center"
                        >
                          Edit
                        </Link>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div><strong>ID:</strong> <Tooltip><TooltipTrigger>{`${u.id.slice(0,8)}...`}</TooltipTrigger><TooltipContent><pre className="text-xs text-gray-700">{u.id}</pre></TooltipContent></Tooltip></div>
                  <div><strong>Email:</strong> {u.email}</div>
                  <div><strong>Tier:</strong> <span className="capitalize">{u.tier}</span></div>
                  <div><strong>API Calls (30d):</strong> {u.api_calls_30d.toLocaleString()}</div>
                  <div><strong>Admin:</strong> {u.is_admin ? 'Yes' : 'No'}</div>
                  <div><strong>Enode:</strong> {u.linked_to_enode ? '✓' : '✗'}</div>
                  <div><strong>Vehicles:</strong> {u.vehicles && u.vehicles.length > 0 ? u.vehicles.map(v => `${v.vendor} (${v.vehicle_id.slice(0,8)}...)`).join(', ') : '–'}</div>
                  <div><strong>Connected:</strong> {u.linked_at ? new Date(u.linked_at).toLocaleString() : '–'}</div>
                  <div className="flex items-center"><strong>Approved:</strong>
                    <Switch checked={u.is_approved} onCheckedChange={val => handleToggleApproval(u.id, val)} className="ml-2" />
                  </div>
                </div>
              </Card>
            ))}
            {!loading && sortedUsers.length === 0 && (
              <div className="text-center text-gray-500 text-sm">No users found.</div>
            )}
          </>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={open => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
          <p>Are you sure you want to delete this user?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmAndDelete}>Yes, Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}