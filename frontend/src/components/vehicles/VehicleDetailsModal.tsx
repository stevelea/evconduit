'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authFetch } from '@/lib/authFetch';
import { useAuth } from '@/hooks/useAuth';
import type { Vehicle } from '@/types/vehicle';

interface VehicleDetailsModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 mt-3">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value ?? '–'}</span>
    </div>
  );
}

export default function VehicleDetailsModal({
  vehicle,
  onClose,
}: VehicleDetailsModalProps) {
  const { information, chargeState, smartChargingPolicy, odometer, isReachable, location } = vehicle;
  const { mergedUser, accessToken } = useAuth({ requireAuth: false });
  const isPro = mergedUser?.tier === 'pro';
  const isAbrp = vehicle.source === 'abrp';
  const abrpExtra = vehicle.abrp_extra;

  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const isPlugged = Boolean(chargeState?.isPluggedIn);
  const isCharging = Boolean(chargeState?.isCharging);
  const canStart = isPro && isPlugged && !isCharging;
  const canStop = isPro && isPlugged && isCharging;

  const handleCharging = async (action: 'START' | 'STOP'): Promise<void> => {
    if (!accessToken) return;

    const isStart = action === 'START';
    setStarting(isStart);
    setStopping(!isStart);

    try {
      const { error } = await authFetch(`/ha/charging/${vehicle.db_id}`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ action }),
      });

      if (error) {
        throw new Error(error.message || `Failed to ${action.toLowerCase()} charging`);
      }

      toast.success(
        `${isStart ? 'Started' : 'Stopped'} charging for ${information?.model} (${information?.vin})`
      );
    } catch (err: unknown) {
      console.error('Charging action failed', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error(message);
    } finally {
      setStarting(false);
      setStopping(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {information?.brand} {information?.model}
            {information?.vin ? ` (${information.vin})` : ''}
          </DialogTitle>
          <DialogDescription>
            Last seen: {vehicle.lastSeen ? new Date(vehicle.lastSeen).toLocaleString() : '–'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-1">
          <Section title="Vehicle">
            {information?.displayName && <Row label="Display Name" value={information.displayName} />}
            <Row label="Brand" value={information?.brand} />
            <Row label="Model" value={information?.model} />
            {information?.year ? <Row label="Year" value={information.year} /> : null}
            {information?.vin && <Row label="VIN" value={information.vin} />}
            <Row label="Source" value={
              isAbrp
                ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">ABRP</span>
                : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">Enode</span>
            } />
            <Row label="Status" value={
              isReachable
                ? <span className="text-green-600">Online</span>
                : <span className="text-gray-400">Offline</span>
            } />
          </Section>

          <Section title="Charge State">
            <Row label="Battery" value={chargeState?.batteryLevel != null ? `${chargeState.batteryLevel}%` : null} />
            <Row label="Charging" value={chargeState?.isCharging != null ? (chargeState.isCharging ? 'Yes' : 'No') : null} />
            <Row label="Plugged In" value={chargeState?.isPluggedIn != null ? (chargeState.isPluggedIn ? 'Yes' : 'No') : null} />
            <Row label="Fully Charged" value={chargeState?.isFullyCharged != null ? (chargeState.isFullyCharged ? 'Yes' : 'No') : null} />
            {chargeState?.chargeRate != null && <Row label="Charge Rate" value={`${chargeState.chargeRate} kW`} />}
            {chargeState?.batteryCapacity != null && <Row label="Battery Capacity" value={`${chargeState.batteryCapacity} kWh`} />}
            {chargeState?.chargeLimit != null && <Row label="Charge Limit" value={`${chargeState.chargeLimit}%`} />}
            {chargeState?.range != null && <Row label="Range" value={`${Math.round(chargeState.range)} km`} />}
            {chargeState?.maxCurrent != null && <Row label="Max Current" value={`${chargeState.maxCurrent} A`} />}
            {chargeState?.powerDeliveryState && <Row label="Power State" value={chargeState.powerDeliveryState} />}
            {chargeState?.chargeTimeRemaining != null && <Row label="Time Remaining" value={`${chargeState.chargeTimeRemaining} min`} />}
            {chargeState?.lastUpdated && <Row label="Updated" value={new Date(chargeState.lastUpdated).toLocaleString()} />}
          </Section>

          {smartChargingPolicy && (
            <Section title="Smart Charging">
              <Row label="Enabled" value={smartChargingPolicy.isEnabled ? 'Yes' : 'No'} />
              {smartChargingPolicy.deadline && <Row label="Deadline" value={smartChargingPolicy.deadline} />}
              {smartChargingPolicy.minimumChargeLimit != null && <Row label="Min Charge Limit" value={`${smartChargingPolicy.minimumChargeLimit}%`} />}
            </Section>
          )}

          {location && (
            <Section title="Location">
              <Row label="Latitude" value={location.latitude} />
              <Row label="Longitude" value={location.longitude} />
              {location.lastUpdated && <Row label="Updated" value={new Date(location.lastUpdated).toLocaleString()} />}
            </Section>
          )}

          {odometer && odometer.distance != null && (
            <Section title="Odometer">
              <Row label="Distance" value={`${Math.round(odometer.distance)} km`} />
              {odometer.lastUpdated && <Row label="Updated" value={new Date(odometer.lastUpdated).toLocaleString()} />}
            </Section>
          )}

          {isAbrp && abrpExtra && Object.keys(abrpExtra).length > 0 && (
            <Section title="ABRP Extra Data">
              {abrpExtra.soh != null && <Row label="State of Health" value={`${abrpExtra.soh}%`} />}
              {abrpExtra.soe != null && <Row label="State of Energy" value={`${abrpExtra.soe} kWh`} />}
              {abrpExtra.voltage != null && <Row label="Voltage" value={`${abrpExtra.voltage} V`} />}
              {abrpExtra.current != null && <Row label="Current" value={`${abrpExtra.current} A`} />}
              {abrpExtra.batt_temp != null && <Row label="Battery Temp" value={`${abrpExtra.batt_temp} °C`} />}
              {abrpExtra.ext_temp != null && <Row label="External Temp" value={`${abrpExtra.ext_temp} °C`} />}
              {abrpExtra.cabin_temp != null && <Row label="Cabin Temp" value={`${abrpExtra.cabin_temp} °C`} />}
              {abrpExtra.speed != null && <Row label="Speed" value={`${abrpExtra.speed} km/h`} />}
              {abrpExtra.heading != null && <Row label="Heading" value={`${abrpExtra.heading}°`} />}
              {abrpExtra.odometer != null && <Row label="Odometer" value={`${abrpExtra.odometer} km`} />}
              {abrpExtra.elevation != null && <Row label="Elevation" value={`${abrpExtra.elevation} m`} />}
              {abrpExtra.capacity != null && <Row label="Battery Capacity" value={`${abrpExtra.capacity} kWh`} />}
              {abrpExtra.est_battery_range != null && <Row label="Est. Range" value={`${abrpExtra.est_battery_range} km`} />}
              {abrpExtra.hvac_power != null && <Row label="HVAC Power" value={`${abrpExtra.hvac_power} W`} />}
              {abrpExtra.hvac_setpoint != null && <Row label="HVAC Setpoint" value={`${abrpExtra.hvac_setpoint} °C`} />}
              {abrpExtra.is_dcfc != null && <Row label="DC Fast Charging" value={abrpExtra.is_dcfc ? 'Yes' : 'No'} />}
              {abrpExtra.is_parked != null && <Row label="Parked" value={abrpExtra.is_parked ? 'Yes' : 'No'} />}
              {abrpExtra.tire_pressure_fl != null && <Row label="Tire FL" value={`${abrpExtra.tire_pressure_fl} bar`} />}
              {abrpExtra.tire_pressure_fr != null && <Row label="Tire FR" value={`${abrpExtra.tire_pressure_fr} bar`} />}
              {abrpExtra.tire_pressure_rl != null && <Row label="Tire RL" value={`${abrpExtra.tire_pressure_rl} bar`} />}
              {abrpExtra.tire_pressure_rr != null && <Row label="Tire RR" value={`${abrpExtra.tire_pressure_rr} bar`} />}
            </Section>
          )}
        </div>

        {/* Charging controls (Enode vehicles only) */}
        {!isAbrp && (
          <div className="mt-4">
            <strong className="text-sm">Charging controls:</strong>
            <div className="flex space-x-2 mt-2">
              <Button
                onClick={() => handleCharging('START')}
                disabled={!canStart || starting}
                size="sm"
              >
                {starting ? 'Starting…' : 'Start'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleCharging('STOP')}
                disabled={!canStop || stopping}
                size="sm"
              >
                {stopping ? 'Stopping…' : 'Stop'}
              </Button>
            </div>
            {!isPro && (
              <p className="text-xs text-gray-500 mt-1">Available for Pro users only</p>
            )}
          </div>
        )}

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
