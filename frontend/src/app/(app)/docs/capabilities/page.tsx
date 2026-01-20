'use client';

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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

export default function CapabilitiesPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-indigo-700 mb-2">Vehicle Capabilities</h1>
      <p className="text-gray-600 mb-8">
        This guide shows what data and controls are available for each vehicle brand through Enode integration.
        Capabilities vary by manufacturer API limitations.
      </p>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">About Capabilities</p>
            <p className="text-sm text-blue-700 mt-1">
              Vehicle capabilities are determined by what each manufacturer exposes through their API.
              Some features like remote charging control may not be available even if your vehicle supports them natively.
            </p>
          </div>
        </div>
      </div>

      <VendorSection data={xpengCapabilities} />

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Missing a brand?</strong> Contact us to request capability documentation for other supported vehicles.
        </p>
      </div>
    </main>
  );
}
