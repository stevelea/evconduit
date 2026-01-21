'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell } from 'lucide-react';

interface UserUpdate {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface UserUpdatesProps {
  accessToken: string | null;
}

export default function UserUpdates({ accessToken }: UserUpdatesProps) {
  const [updates, setUpdates] = useState<UserUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await authFetch('/user-updates', {
          method: 'GET',
          accessToken,
        });

        if (!error && data) {
          setUpdates(data);
        }
      } catch (error) {
        console.error('Error fetching user updates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
  }, [accessToken]);

  if (loading) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24 bg-blue-200" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full bg-blue-200 mb-2" />
          <Skeleton className="h-4 w-3/4 bg-blue-200" />
        </CardContent>
      </Card>
    );
  }

  if (updates.length === 0) {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-blue-900 flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {updates.map((update) => (
          <div key={update.id} className="border-l-2 border-blue-300 pl-3">
            <h4 className="font-medium text-blue-900 text-sm">{update.title}</h4>
            <p className="text-blue-800 text-sm whitespace-pre-wrap">
              {update.content}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
