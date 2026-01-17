'use client';

// app/(app)/admin/users/[id]/page.tsx

import React, { useState } from "react";
import { useParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserDetails } from "@/hooks/useUserDetails";
import { UserDetailHeader } from "@/components/admin/user/UserDetailHeader";
import { Card } from "@/components/ui/card";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { user, vehicles, loading, updateUserField } = useUserDetails(id);
  const [tab, setTab] = useState("vehicles");

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row gap-6">
        {user && (
          <UserDetailHeader
            user={user}
            loading={loading}
            updateUserField={updateUserField}
          />
        )}
        {!user && !loading && (
          <div className="text-red-600">User not found.</div>
        )}
        {loading && (
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-8 w-40 mb-2 bg-indigo-100" />
            <Skeleton className="h-6 w-64 mb-2 bg-indigo-100" />
            <Skeleton className="h-6 w-52 mb-2 bg-indigo-100" />
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-8 w-32 bg-indigo-100" />
            ) : user ? (
              vehicles.length > 0 ? (
                <div className="space-y-3">
                  {vehicles.map((v) => (
                    <Card key={v.vehicle_id} className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-700">{v.vendor}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Vehicle ID:</strong>{" "}
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {v.vehicle_id}
                          </span>
                        </div>
                        {v.updated_at && (
                          <div className="text-sm text-gray-500">
                            <strong>Last Updated:</strong>{" "}
                            {new Date(v.updated_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  No vehicles linked to this user.
                </div>
              )
            ) : (
              <span className="text-red-600">
                No user to show vehicles for.
              </span>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-8 w-32 bg-indigo-100" />
            ) : user ? (
              <span>
                Logs will go here for{" "}
                <span className="font-mono">{user.id}</span>
              </span>
            ) : (
              <span className="text-red-600">
                No user to show logs for.
              </span>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stripe">
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-8 w-32 bg-indigo-100" />
            ) : user ? (
              <span>
                Stripe information for{" "}
                <span className="font-mono">{user.id}</span>
              </span>
            ) : (
              <span className="text-red-600">
                No user to show Stripe info for.
              </span>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
