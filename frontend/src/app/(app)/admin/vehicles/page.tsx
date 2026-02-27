// app/dashboard/VehicleAdminPage.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Eye, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/authFetch';

type SortKey = 'userName' | 'vendor' | 'model' | 'battery' | 'pluggedIn' | 'lastSeen' | 'createdAt';
type SortDir = 'asc' | 'desc';

// Render vehicles in a table on larger screens and card list on mobile

type Vehicle = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  vendor: string;
  source?: string;
  lastSeen: string;
  isReachable: boolean;
  countryCode?: string | null;
  enodeAccountId?: string | null;
  enodeAccountName?: string | null;
  createdAt?: string | null;
  information: {
    vin: string;
    brand: string;
    model: string;
    year: number;
    displayName: string;
  };
  chargeState?: {
    batteryLevel?: number | null;
    isCharging?: boolean;
    isPluggedIn?: boolean;
    isFullyCharged?: boolean;
    batteryCapacity?: number | null;
    chargeLimit?: number | null;
    chargeRate?: number | null;
    chargeTimeRemaining?: number | null;
    lastUpdated?: string;
    maxCurrent?: number | null;
    powerDeliveryState?: string;
    range?: number | null;
  };
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated?: string;
  } | null;
  odometer?: {
    distance?: number | null;
    lastUpdated?: string | null;
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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

function VehicleDetailView({ vehicle }: { vehicle: Vehicle | null }) {
  if (!vehicle) return null;
  const v = vehicle;
  const cs = v.chargeState;
  const loc = v.location;
  const odo = v.odometer;
  const abrpExtra = v.abrp_extra as Record<string, number | string> | undefined;
  const isAbrp = v.source === 'abrp';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 mt-3">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value ?? '–'}</span>
    </div>
  );

  return (
    <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
      <Section title="Owner">
        <Row label="User" value={v.userName} />
        <Row label="Email" value={v.userEmail} />
        <Row label="User ID" value={<span className="font-mono text-xs">{v.userId}</span>} />
      </Section>

      <Section title="Vehicle">
        <Row label="Display Name" value={v.information?.displayName} />
        <Row label="Brand" value={v.information?.brand} />
        <Row label="Model" value={v.information?.model} />
        {v.information?.year ? <Row label="Year" value={v.information.year} /> : null}
        <Row label="VIN" value={v.information?.vin || '–'} />
        <Row label="Vendor" value={v.vendor} />
        <Row label="Source" value={
          isAbrp
            ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">ABRP Web Pull</span>
            : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">Enode</span>
        } />
        <Row label="Account" value={v.enodeAccountName} />
        <Row label="Vehicle ID" value={<span className="font-mono text-xs">{v.id}</span>} />
        <Row label="Reachable" value={v.isReachable ? 'Yes' : 'No'} />
        {v.countryCode && <Row label="Country" value={`${countryCodeToFlag(v.countryCode)} ${v.countryCode}`} />}
      </Section>

      <Section title="Charge State">
        <Row label="Battery" value={cs?.batteryLevel != null ? `${cs.batteryLevel}%` : null} />
        <Row label="Charging" value={cs?.isCharging != null ? (cs.isCharging ? 'Yes' : 'No') : null} />
        <Row label="Plugged In" value={cs?.isPluggedIn != null ? (cs.isPluggedIn ? 'Yes' : 'No') : null} />
        <Row label="Fully Charged" value={cs?.isFullyCharged != null ? (cs.isFullyCharged ? 'Yes' : 'No') : null} />
        {cs?.chargeRate != null && <Row label="Charge Rate" value={`${cs.chargeRate} kW`} />}
        {cs?.batteryCapacity != null && <Row label="Battery Capacity" value={`${cs.batteryCapacity} kWh`} />}
        {cs?.chargeLimit != null && <Row label="Charge Limit" value={`${cs.chargeLimit}%`} />}
        {cs?.range != null && <Row label="Range" value={`${cs.range} km`} />}
        {cs?.maxCurrent != null && <Row label="Max Current" value={`${cs.maxCurrent} A`} />}
        {cs?.powerDeliveryState && <Row label="Power State" value={cs.powerDeliveryState} />}
        {cs?.chargeTimeRemaining != null && <Row label="Time Remaining" value={`${cs.chargeTimeRemaining} min`} />}
        {cs?.lastUpdated && <Row label="Updated" value={new Date(cs.lastUpdated).toLocaleString()} />}
      </Section>

      {loc && (
        <Section title="Location">
          <Row label="Latitude" value={loc.latitude} />
          <Row label="Longitude" value={loc.longitude} />
          {loc.lastUpdated && <Row label="Updated" value={new Date(loc.lastUpdated).toLocaleString()} />}
        </Section>
      )}

      {odo && odo.distance != null && (
        <Section title="Odometer">
          <Row label="Distance" value={`${odo.distance} km`} />
          {odo.lastUpdated && <Row label="Updated" value={new Date(odo.lastUpdated).toLocaleString()} />}
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

      <Section title="Timestamps">
        <Row label="Last Seen" value={v.lastSeen ? new Date(v.lastSeen).toLocaleString() : null} />
        {v.createdAt && <Row label="Added" value={new Date(v.createdAt).toLocaleString()} />}
      </Section>
    </div>
  );
}

export default function VehicleAdminPage() {
  const { user, accessToken } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('userName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="inline ml-1 h-3 w-3" />
      : <ArrowDown className="inline ml-1 h-3 w-3" />;
  };

  const sortedVehicles = useMemo(() => {
    const sorted = [...vehicles].sort((a, b) => {
      let aVal: string | number | boolean;
      let bVal: string | number | boolean;
      switch (sortKey) {
        case 'userName':
          aVal = (a.userName || '').toLowerCase();
          bVal = (b.userName || '').toLowerCase();
          break;
        case 'vendor':
          aVal = a.vendor.toLowerCase();
          bVal = b.vendor.toLowerCase();
          break;
        case 'model':
          aVal = a.information.model.toLowerCase();
          bVal = b.information.model.toLowerCase();
          break;
        case 'battery':
          aVal = a.chargeState?.batteryLevel ?? -1;
          bVal = b.chargeState?.batteryLevel ?? -1;
          break;
        case 'pluggedIn':
          aVal = a.chargeState?.isPluggedIn ? 1 : 0;
          bVal = b.chargeState?.isPluggedIn ? 1 : 0;
          break;
        case 'lastSeen':
          aVal = a.lastSeen || '';
          bVal = b.lastSeen || '';
          break;
        case 'createdAt':
          aVal = a.createdAt || '';
          bVal = b.createdAt || '';
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [vehicles, sortKey, sortDir]);

  const fetchVehicles = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await authFetch('/admin/vehicles', { method: 'GET', accessToken });
      if (res.error) {
        toast.error('Failed to fetch vehicles'); /* Hardcoded string */
        return;
      }
      setVehicles(res.data || []);
    } catch {
      toast.error('Could not load vehicles'); /* Hardcoded string */
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { if (user) fetchVehicles(); }, [user, fetchVehicles]);
  

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-indigo-700">Vehicle Administration</h1>
        <Button onClick={fetchVehicles} disabled={loading} className="mt-2 sm:mt-0">
          {loading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />Refreshing...</> /* Hardcoded string */ : 'Refresh' /* Hardcoded string */}
        </Button>
      </header>

      <div className="text-sm text-gray-600">Showing {vehicles.length} vehicles</div>

      {/* Table for desktop */}
      <Card className="hidden lg:block overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('userName')}>User<SortIcon column="userName" /></th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('vendor')}>Vendor<SortIcon column="vendor" /></th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('model')}>Model<SortIcon column="model" /></th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('battery')}>Battery<SortIcon column="battery" /></th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('pluggedIn')}>Plugged In<SortIcon column="pluggedIn" /></th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('lastSeen')}>Last Seen<SortIcon column="lastSeen" /></th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700" onClick={() => toggleSort('createdAt')}>Added<SortIcon column="createdAt" /></th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedVehicles.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{countryCodeToFlag(v.countryCode)} {v.userName || '–'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{v.vendor}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{v.information.model}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{v.chargeState?.batteryLevel ?? '–'}%</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{v.chargeState?.isPluggedIn ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{v.lastSeen ? new Date(v.lastSeen).toLocaleString() : '–'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '–'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {v.enodeAccountName ? (
                    <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs">{v.enodeAccountName}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="secondary" onClick={() => setSelected(v)} title="View details"> {/* Hardcoded string */}
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle>Vehicle Details</DialogTitle></DialogHeader>
                      <VehicleDetailView vehicle={selected} />
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
            {!loading && vehicles.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500">No vehicles found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Card list for mobile */}
      <div className="space-y-4 lg:hidden">
        {vehicles.map((v) => (
          <Card key={v.id} className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-gray-900">{countryCodeToFlag(v.countryCode)} {v.userName || v.information.displayName}</div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="icon" variant="secondary" onClick={() => setSelected(v)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Vehicle Details</DialogTitle></DialogHeader>
                  <VehicleDetailView vehicle={selected} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-1 text-sm text-gray-700">
              <div><strong>Vendor:</strong> {v.vendor}</div>
              <div><strong>Model:</strong> {v.information.model}</div>
              <div><strong>Battery:</strong> {v.chargeState?.batteryLevel ?? '–'}%</div>
              <div><strong>Last Seen:</strong> {v.lastSeen ? new Date(v.lastSeen).toLocaleString() : '–'}</div>
              <div><strong>Added:</strong> {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '–'}</div>
            </div>
          </Card>
        ))}
        {!loading && vehicles.length === 0 && (
          <div className="text-center text-gray-500 text-sm">No vehicles found.</div> /* Hardcoded string */ /* Hardcoded string */
        )}
      </div>
    </div>
  );
}
