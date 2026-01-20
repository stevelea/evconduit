'use client';

// app/(app)/admin/users/[id]/page.tsx

import React, { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserDetails } from "@/hooks/useUserDetails";
import { UserDetailHeader } from "@/components/admin/user/UserDetailHeader";
import { Card } from "@/components/ui/card";
import { Webhook, Activity } from "lucide-react";

/**
 * Convert a 2-letter country code to a flag emoji.
 * Uses Unicode regional indicator symbols.
 */
function countryCodeToFlag(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '';
  const offset = 127397; // Regional indicator symbol A starts at 127462, 'A' is 65, so offset is 127462-65
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { user, vehicles, webhookLogs, pollLogs, logsLoading, loading, updateUserField, refetch, fetchLogs } = useUserDetails(id);
  const [tab, setTab] = useState("vehicles");

  // Fetch logs when switching to logs tab
  useEffect(() => {
    if (tab === "logs" && webhookLogs.length === 0 && pollLogs.length === 0) {
      fetchLogs();
    }
  }, [tab, webhookLogs.length, pollLogs.length, fetchLogs]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row gap-6">
        {user && (
          <UserDetailHeader
            user={user}
            loading={loading}
            updateUserField={updateUserField}
            onRefresh={refetch}
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
                          {v.country_code && (
                            <span className="text-lg" title={v.country_code}>
                              {countryCodeToFlag(v.country_code)} {v.country_code}
                            </span>
                          )}
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
          <div className="mt-4 space-y-6">
            {logsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full bg-indigo-100" />
                <Skeleton className="h-8 w-full bg-indigo-100" />
                <Skeleton className="h-8 w-full bg-indigo-100" />
              </div>
            ) : user ? (
              <>
                {/* Webhook Logs */}
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <Webhook className="w-5 h-5 text-indigo-600" />
                    Webhook Logs ({webhookLogs.length})
                  </h3>
                  {webhookLogs.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {webhookLogs.map((log) => (
                        <Card key={log.id} className="p-3 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-indigo-700">{log.event_type}</span>
                              <div className="text-xs text-gray-500 font-mono mt-1">
                                Vehicle: {log.vehicle_id?.slice(0, 12)}...
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No webhook logs found.</p>
                  )}
                </div>

                {/* Poll Logs */}
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-green-600" />
                    Poll Logs ({pollLogs.length})
                  </h3>
                  {pollLogs.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {pollLogs.map((log) => (
                        <Card key={log.id} className="p-3 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-green-700">{log.endpoint}</span>
                              <div className="text-xs text-gray-500 font-mono mt-1">
                                Vehicle: {log.vehicle_id?.slice(0, 12)}...
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No poll logs found.</p>
                  )}
                </div>
              </>
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
