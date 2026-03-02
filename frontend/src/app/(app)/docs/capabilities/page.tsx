'use client';

import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

type Capability = {
  name: string;
  description: string;
  isCapable: boolean;
  notes?: string;
};

type VendorCapabilities = {
  vendor: string;
  logo?: string;
  lastUpdated: string;
  capabilities: Capability[];
};

type DataField = {
  field: string;
  description: string;
  tokenBased: boolean;
  sessionBased: boolean;
  notes?: string;
};

const xpengCapabilities: VendorCapabilities = {
  vendor: 'XPENG',
  lastUpdated: '2026-01-19',
  capabilities: [
    { name: 'information', description: 'Vehicle information (VIN, model, year)', isCapable: true },
    { name: 'chargeState', description: 'Battery level, charging status, range', isCapable: true },
    { name: 'location', description: 'GPS location tracking', isCapable: true },
    { name: 'odometer', description: 'Odometer reading', isCapable: false, notes: 'Not available via XPENG API' },
    { name: 'startCharging', description: 'Remote start charging', isCapable: true },
    { name: 'stopCharging', description: 'Remote stop charging', isCapable: true },
  ],
};

const abrpDataFields: DataField[] = [
  // Core fields
  { field: 'soc', description: 'State of charge (%)', tokenBased: true, sessionBased: true },
  { field: 'is_charging', description: 'Whether the vehicle is charging', tokenBased: true, sessionBased: true },
  { field: 'power', description: 'Charging/discharging power (kW)', tokenBased: true, sessionBased: true },
  { field: 'est_battery_range', description: 'Estimated battery range (km)', tokenBased: true, sessionBased: true },
  { field: 'capacity', description: 'Battery capacity (kWh)', tokenBased: true, sessionBased: true },
  { field: 'soh', description: 'State of health (%)', tokenBased: true, sessionBased: true },
  { field: 'soe', description: 'State of energy (kWh)', tokenBased: true, sessionBased: true },
  // Location
  { field: 'lat / lon', description: 'GPS coordinates', tokenBased: true, sessionBased: true },
  { field: 'speed', description: 'Vehicle speed (km/h)', tokenBased: true, sessionBased: true },
  { field: 'heading', description: 'Compass heading (degrees)', tokenBased: true, sessionBased: true },
  { field: 'elevation', description: 'Elevation (m)', tokenBased: true, sessionBased: true },
  // Electrical
  { field: 'voltage', description: 'Battery voltage (V)', tokenBased: false, sessionBased: true, notes: 'Session-based only' },
  { field: 'current', description: 'Battery current (A)', tokenBased: false, sessionBased: true, notes: 'Session-based only' },
  // Temperature & climate
  { field: 'batt_temp', description: 'Battery temperature (°C)', tokenBased: false, sessionBased: true, notes: 'Session-based only' },
  { field: 'ext_temp', description: 'External temperature (°C)', tokenBased: true, sessionBased: true },
  { field: 'cabin_temp', description: 'Cabin temperature (°C)', tokenBased: false, sessionBased: true, notes: 'Session-based only' },
  { field: 'hvac_power', description: 'HVAC power draw (kW)', tokenBased: false, sessionBased: true, notes: 'Session-based only' },
  { field: 'hvac_setpoint', description: 'HVAC target temperature (°C)', tokenBased: false, sessionBased: true, notes: 'Session-based only' },
  // Mechanical
  { field: 'odometer', description: 'Odometer reading (km)', tokenBased: true, sessionBased: true },
  { field: 'is_parked', description: 'Whether the vehicle is parked', tokenBased: true, sessionBased: true },
  { field: 'is_dcfc', description: 'Whether using DC fast charging', tokenBased: true, sessionBased: true },
  // Tires
  { field: 'tire_pressure (×4)', description: 'Individual tire pressures (FL, FR, RL, RR)', tokenBased: false, sessionBased: true, notes: 'Session-based only' },
];

function CapabilityIcon({ isCapable }: { isCapable: boolean }) {
  if (isCapable) {
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
  return <XCircle className="w-5 h-5 text-red-400" />;
}

function VendorSection({ data }: { data: VendorCapabilities }) {
  const supportedCount = data.capabilities.filter(c => c.isCapable).length;
  const totalCount = data.capabilities.length;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-indigo-700">{data.vendor}</h2>
        <span className="text-sm text-gray-500">
          {supportedCount}/{totalCount} capabilities supported
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">Last updated: {data.lastUpdated}</p>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Capability</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Supported</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.capabilities.map((cap) => (
              <tr key={cap.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{cap.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{cap.description}</td>
                <td className="px-4 py-3 text-center">
                  <CapabilityIcon isCapable={cap.isCapable} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{cap.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ABRPDataSection() {
  const tokenCount = abrpDataFields.filter(f => f.tokenBased).length;
  const sessionCount = abrpDataFields.filter(f => f.sessionBased).length;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-indigo-700 mb-2">ABRP Data Source</h2>
      <p className="text-sm text-gray-600 mb-6">
        EVConduit can pull vehicle telemetry from{' '}
        <a href="https://abetterrouteplanner.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
          A Better Route Planner (ABRP)
        </a>{' '}
        as an alternative or supplement to Enode. This is useful for vehicles not supported by Enode, or to get
        additional data points like battery temperature and tire pressure. Data is polled every 60 seconds.
      </p>

      {/* Connection methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Token-Based (Recommended)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Uses your ABRP user token with EVConduit&apos;s official API key. Easiest to set up — just paste your token from the ABRP app.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-gray-700">{tokenCount} data fields available</span>
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Session-Based (Advanced)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Uses your ABRP session token, API key, and vehicle ID. Returns richer telemetry data including battery
            voltage, current, temperatures, and tire pressures.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-gray-700">{sessionCount} data fields available</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            When both connection methods are configured, EVConduit prefers session-based (richer data) and
            automatically falls back to token-based if the session expires. Actual data availability depends on what
            your car reports to ABRP — not all vehicles provide every field.
          </p>
        </div>
      </div>

      {/* Data fields table */}
      <p className="text-sm text-gray-500 mb-4">Last updated: 2026-03-01</p>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Field</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Token</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Session</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {abrpDataFields.map((f) => (
              <tr key={f.field} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{f.field}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{f.description}</td>
                <td className="px-4 py-3 text-center">
                  <CapabilityIcon isCapable={f.tokenBased} />
                </td>
                <td className="px-4 py-3 text-center">
                  <CapabilityIcon isCapable={f.sessionBased} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{f.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CapabilitiesPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-indigo-700 mb-2">Vehicle Capabilities</h1>
      <p className="text-gray-600 mb-8">
        EVConduit supports multiple data sources for vehicle telemetry. Capabilities vary by
        data source and manufacturer API limitations.
      </p>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">About Data Sources</p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Enode</strong> connects directly to manufacturer APIs and supports remote commands
              (start/stop charging). <strong>ABRP</strong> provides read-only telemetry data from vehicles
              connected to A Better Route Planner, often with extra fields like battery temperature and tire pressure.
              Both sources can be used together — ABRP data enriches Enode vehicles automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Enode section */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Enode (Manufacturer APIs)</h2>
        <p className="text-sm text-gray-600 mb-6">
          Direct connection to vehicle manufacturer APIs via Enode. Supports read and write operations
          (remote commands) depending on the manufacturer.
        </p>
      </div>
      <VendorSection data={xpengCapabilities} />

      {/* ABRP section */}
      <ABRPDataSection />

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Missing a brand?</strong> Contact us to request capability documentation for other supported vehicles.
          ABRP supports 100+ EV models — if your car works with ABRP, it works with EVConduit.
        </p>
      </div>
    </main>
  );
}
