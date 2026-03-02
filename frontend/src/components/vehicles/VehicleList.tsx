import React, { memo, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vehicle } from "@/types/vehicle";
import clsx from "clsx";

// Format lastSeen time in user's local timezone
function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return "Unknown";
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Show relative time for recent, absolute for older
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older dates, show date and time in local timezone
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Merge vehicles from different sources (Enode + ABRP) that represent the same car.
// Matching: same brand (case-insensitive) within the same user — mirrors backend cross_populate logic.
function mergeVehicles(vehicles: Vehicle[]): Vehicle[] {
  const byBrand = new Map<string, Vehicle[]>();

  for (const v of vehicles) {
    const brand = (v.information?.brand || '').toLowerCase();
    if (!brand) {
      // No brand — can't match, pass through as-is
      byBrand.set(v.id, [v]);
      continue;
    }
    const existing = byBrand.get(brand);
    if (existing) {
      existing.push(v);
    } else {
      byBrand.set(brand, [v]);
    }
  }

  const result: Vehicle[] = [];

  for (const group of byBrand.values()) {
    if (group.length === 1) {
      // Single source — tag with sources array for consistent badge rendering
      const v = group[0];
      result.push({ ...v, sources: [v.source || 'enode'] });
      continue;
    }

    // Find Enode (primary) and ABRP vehicles
    const enode = group.find((v) => v.source !== 'abrp');
    const abrp = group.find((v) => v.source === 'abrp');

    if (enode && abrp) {
      // Merge: Enode is primary, attach ABRP reference
      const lastSeen = pickMostRecent(enode.lastSeen, abrp.lastSeen);
      result.push({
        ...enode,
        lastSeen,
        sources: ['enode', 'abrp'],
        abrpVehicle: abrp,
        // If Enode lacks abrp_extra but ABRP has it, carry it over
        abrp_extra: enode.abrp_extra || abrp.abrp_extra,
      });
    } else {
      // Multiple vehicles of same brand but same source — don't merge, pass through
      for (const v of group) {
        result.push({ ...v, sources: [v.source || 'enode'] });
      }
    }
  }

  return result;
}

function pickMostRecent(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

function SourceBadges({ sources }: { sources?: ('enode' | 'abrp')[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <>
      {sources.includes('enode') && (
        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">E</span>
      )}
      {sources.includes('abrp') && (
        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">ABRP</span>
      )}
    </>
  );
}

type Props = {
  vehicles: Vehicle[];
  loading: boolean;
  onUnlinkVendor: (vendor: string) => void;
  onDetailsClick: (vehicle: Vehicle) => void;
  onCopyIdClick: (vehicle: Vehicle) => void;
};

function VehicleList({
  vehicles,
  loading,
  onUnlinkVendor,
  onDetailsClick,
  onCopyIdClick,
}: Props) {
  const merged = useMemo(() => mergeVehicles(vehicles || []), [vehicles]);

  if (loading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="rounded-xl border bg-white overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-6 py-3 text-left font-bold text-gray-800">Vehicle</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-800">Battery</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-800">Range</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-800">Status</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(2)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-52 bg-indigo-100" />
                      <Skeleton className="h-4 w-40 mt-1 bg-indigo-100" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-12 bg-indigo-100" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-12 bg-indigo-100" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-16 bg-indigo-100" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-9 w-20 bg-indigo-100" />
                        <Skeleton className="h-9 w-20 bg-indigo-100" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Mobil skeleton */}
        <div className="md:hidden flex flex-col gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-4">
              <Skeleton className="h-7 w-2/3 mb-2 bg-indigo-100" />
              <Skeleton className="h-4 w-1/2 mb-1 bg-indigo-100" />
              <Skeleton className="h-4 w-1/3 mb-4 bg-indigo-100" />
              <div className="flex flex-row gap-2">
                <Skeleton className="h-9 flex-1 bg-indigo-100" />
                <Skeleton className="h-9 flex-1 bg-indigo-100" />
                <Skeleton className="h-9 flex-1 bg-indigo-100" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-center">
        No vehicles linked yet.
      </div>
    );
  }

  // Desktop/tablet
  return (
    <>
      <div className="hidden md:block">
        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-6 py-3 text-left font-bold text-gray-800">Vehicle</th>
                <th className="px-6 py-3 text-left font-bold text-gray-800">Battery</th>
                <th className="px-6 py-3 text-left font-bold text-gray-800">Range</th>
                <th className="px-6 py-3 text-left font-bold text-gray-800">Status</th>
                <th className="px-6 py-3 text-left font-bold text-gray-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {merged.map((vehicle) => {
                const displayName =
                  vehicle.information?.displayName ||
                  [vehicle.information?.brand, vehicle.information?.model]
                    .filter(Boolean)
                    .join(" ") ||
                  vehicle.db_id;

                const battery =
                  vehicle.chargeState?.batteryLevel != null
                    ? `${vehicle.chargeState.batteryLevel}%`
                    : "-";
                const range =
                  vehicle.chargeState?.range != null
                    ? `${vehicle.chargeState.range} km`
                    : "-";
                const status =
                  vehicle.isReachable === true
                    ? "Online"
                    : vehicle.isReachable === false
                    ? "Offline"
                    : "-";

                return (
                  <tr key={vehicle.id} className="border-b">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {displayName}
                        <SourceBadges sources={vehicle.sources} />
                      </div>
                      <div className="text-xs text-gray-400">
                        Vehicle ID: {vehicle.db_id}
                      </div>
                      <div className="text-xs text-gray-400">
                        Last seen: {formatLastSeen(vehicle.lastSeen)}
                      </div>
                    </td>
                    <td className="px-6 py-4">{battery}</td>
                    <td className="px-6 py-4">{range}</td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          status === "Online" && "text-green-600 font-medium",
                          status === "Offline" && "text-red-500 font-medium"
                        )}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-row gap-2 w-full">
                        <button
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
                          onClick={() => onDetailsClick(vehicle)}
                        >
                          Details
                        </button>
                        <button
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
                          onClick={() => onCopyIdClick(vehicle)}
                        >
                          Copy ID
                        </button>
                        <button
                          className="px-3 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition text-sm"
                          onClick={() => onUnlinkVendor(vehicle.vendor)}
                        >
                          Unlink
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Mobil/kort, actions bredvid varandra */}
      <div className="md:hidden flex flex-col gap-4">
        {merged.map((vehicle) => {
          const displayName =
            vehicle.information?.displayName ||
            [vehicle.information?.brand, vehicle.information?.model]
              .filter(Boolean)
              .join(" ") ||
            vehicle.db_id;

          const battery =
            vehicle.chargeState?.batteryLevel != null
              ? `${vehicle.chargeState.batteryLevel}%`
              : "-";
          const range =
            vehicle.chargeState?.range != null
              ? `${vehicle.chargeState.range} km`
              : "-";
          const status =
            vehicle.isReachable === true
              ? "Online"
              : vehicle.isReachable === false
              ? "Offline"
              : "-";

          return (
            <div
              key={vehicle.id}
              className="rounded-xl border bg-white p-4 flex flex-col gap-2 shadow-sm"
            >
              <div className="font-semibold text-lg text-gray-900">
                {displayName}
                <SourceBadges sources={vehicle.sources} />
              </div>
              <div className="text-xs text-gray-400">Vehicle ID: {vehicle.db_id}</div>
              <div className="text-xs text-gray-400 mb-1">Last seen: {formatLastSeen(vehicle.lastSeen)}</div>
              <div className="text-sm text-gray-600 mb-1">
                Battery: <span className="font-medium">{battery}</span>
                {" · "}
                Range: <span className="font-medium">{range}</span>
              </div>
              <div className="text-sm mb-2">
                Status:{" "}
                <span
                  className={clsx(
                    status === "Online" && "text-green-600 font-medium",
                    status === "Offline" && "text-red-500 font-medium"
                  )}
                >
                  {status}
                </span>
              </div>
              <div className="flex flex-row gap-2 mt-2">
                <button
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
                  onClick={() => onDetailsClick(vehicle)}
                >
                  Details
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
                  onClick={() => onCopyIdClick(vehicle)}
                >
                  Copy ID
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition text-sm"
                  onClick={() => onUnlinkVendor(vehicle.vendor)}
                >
                  Unlink
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// Memoize to prevent re-renders when parent state changes but vehicles don't
export default memo(VehicleList);
