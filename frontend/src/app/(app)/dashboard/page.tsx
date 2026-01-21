"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/authFetch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import LinkVehicleDialog from "@/components/dashboard/LinkVehicleDialog";
import UserUpdates from "@/components/dashboard/UserUpdates";
import VehicleList from "@/components/vehicles/VehicleList";
import UnlinkVendorDialog from "@/components/dashboard/UnlinkVendorDialog";
import VehicleDetailsModal from "@/components/vehicles/VehicleDetailsModal";
import type { Vehicle } from "@/types/vehicle";

export default function DashboardPage() {
  // Hooks i topp
  const { user, accessToken, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [haError, setHaError] = useState<string | null>(null);
  const justClosedRef = useRef(false);

  // Hämta fordon från backend
  const fetchVehicles = useCallback(async () => {
    if (!accessToken) return;
    setVehiclesLoading(true);

    const { data, error } = await authFetch("/user/vehicles", {
      method: "GET",
      accessToken,
    });

    if (error) {
      toast.error("Failed to fetch vehicles");
      setVehicles([]);
    } else {
      try {
        if (Array.isArray(data)) {
          // Eventuell sträng->objekt parse, beroende på backend
          const parsed = data.flatMap((v) =>
            typeof v === "string" ? [JSON.parse(v)] : [v]
          );
          setVehicles(parsed);
        } else {
          toast.error("Unexpected vehicle data format");
        }
      } catch {
        toast.error("Failed to parse vehicles");
      }
    }
    setVehiclesLoading(false);
  }, [accessToken]);

  // Check HA webhook status for errors
  const checkHaStatus = useCallback(async () => {
    if (!accessToken || !user) return;
    const { data } = await authFetch(`/user/${user.id}/webhook/stats`, {
      method: "GET",
      accessToken,
    });
    if (data?.last_error) {
      setHaError(data.last_error);
    } else {
      setHaError(null);
    }
  }, [accessToken, user]);

  // Hämta vid mount/user/token ändring
  useEffect(() => {
    if (accessToken) {
      fetchVehicles();
      checkHaStatus();
    }
  }, [accessToken, fetchVehicles, checkHaStatus]);

  // Refresh vehicles from Enode (bypasses webhook, polls directly)
  const handleRefresh = useCallback(async () => {
    if (!accessToken || refreshing) return;
    setRefreshing(true);

    const { data, error } = await authFetch("/me/vehicles/refresh", {
      method: "POST",
      accessToken,
    });

    if (error) {
      toast.error("Failed to refresh vehicle data");
    } else {
      const count = data?.vehicles_updated ?? 0;
      if (count > 0) {
        toast.success(`Refreshed ${count} vehicle(s) from manufacturer`);
        fetchVehicles(); // Reload the vehicle list with new data
      } else {
        toast.info("Vehicle data is already up to date");
      }
    }
    setRefreshing(false);
  }, [accessToken, refreshing, fetchVehicles]);

  // Unlink triggers fetch
  const openUnlinkDialog = useCallback((vendor: string) => {
    setSelectedVendor(vendor);
    setUnlinkDialogOpen(true);
  }, []);

  const handleCopyID = useCallback(
    async (vehicle: Vehicle) => {
      if (!accessToken || !vehicle.db_id) {
        toast.error("Missing access token or vehicle ID"); /* Hardcoded string */
        return;
      }
      try {
        await navigator.clipboard.writeText(vehicle.db_id);
        toast.success("Vehicle ID copied to clipboard!"); /* Hardcoded string */
      } catch {
        toast.error("Failed to copy vehicle ID"); /* Hardcoded string */
      }
    },
    [accessToken]
  );

  const handleConfirmUnlink = useCallback(async () => {
    if (!accessToken || !selectedVendor) return;

    const { error } = await authFetch("/user/unlink", {
      method: "POST",
      accessToken,
      body: JSON.stringify({ vendor: selectedVendor }),
    });

    if (error) {
      toast.error("Failed to unlink vendor"); /* Hardcoded string */
    } else {
      toast.success(`Vendor ${selectedVendor} unlinked`); /* Hardcoded string */
      fetchVehicles(); // Uppdatera fordon efter unlink
    }
    setUnlinkDialogOpen(false);
  }, [accessToken, selectedVendor, fetchVehicles]);

  const handleCloseModal = useCallback(() => {
    justClosedRef.current = true;
    setSelectedVehicle(null);
  }, []);

  const vendorVehicles = selectedVendor
    ? vehicles.filter((v) => v.vendor === selectedVendor)
    : [];

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3 mb-4 bg-indigo-100" />
          <Skeleton className="h-10 w-56 mb-4 bg-indigo-100" />
        </div>
      </main>
    );
  }

  if (!user || !accessToken) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6">
      <div className="space-y-6">
        {/* Hardcoded string */}
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700">
          Welcome, {user.user_metadata?.name ?? "User"}
        </h1>

        <div className="flex flex-wrap gap-3">
          <LinkVehicleDialog accessToken={accessToken} />
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing || vehiclesLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh from Enode"}
          </Button>
        </div>

        {/* User Updates */}
        <UserUpdates accessToken={accessToken} />

        {/* HA Vehicle ID Mismatch Warning */}
        {haError === "vehicle_id_mismatch" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Home Assistant Configuration Issue</p>
              <p className="text-amber-700 mt-1">
                Your Home Assistant is rejecting vehicle updates because the configured vehicle ID doesn&apos;t match.
                This can happen after relinking your vehicle.
              </p>
              <p className="text-amber-600 mt-2">
                <strong>To fix:</strong> Go to Home Assistant → Settings → Devices & Services → EVConduit and update the vehicle ID.
                You can copy the correct ID using the copy button on your vehicle card below.
              </p>
            </div>
          </div>
        )}

        <VehicleList
          vehicles={vehicles}
          loading={vehiclesLoading}
          onUnlinkVendor={openUnlinkDialog}
          onDetailsClick={setSelectedVehicle}
          onCopyIdClick={handleCopyID}
        />

        <UnlinkVendorDialog
          open={unlinkDialogOpen}
          onOpenChange={setUnlinkDialogOpen}
          vendor={selectedVendor ?? ""}
          vehicles={vendorVehicles}
          onConfirm={handleConfirmUnlink}
        />

        {selectedVehicle && (
          <VehicleDetailsModal
            vehicle={selectedVehicle}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </main>
  );
}
