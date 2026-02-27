'use client';

import { ExternalLink, AlertTriangle, CheckCircle, RefreshCw, Download } from 'lucide-react';

export default function AbrpPullGuidePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-indigo-700 mb-2">
        ABRP Vehicle Data Pull
      </h1>
      <p className="text-gray-600 mb-8">
        Use A Better Route Planner as an alternative vehicle data source — no Enode account required.
      </p>

      {/* What is it */}
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-8 rounded">
        <div className="flex items-start gap-2">
          <Download className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-indigo-800">What is ABRP API?</p>
            <p className="text-sm text-indigo-700 mt-1">
              EVConduit normally connects to your vehicle through <strong>Enode</strong>, which
              has limited free capacity (5 vehicles per account). ABRP API is an alternative
              that reads your vehicle&apos;s telemetry data directly from{' '}
              <a
                href="https://abetterrouteplanner.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                A Better Route Planner (ABRP)
              </a>
              , bypassing Enode entirely. This is ideal if Enode capacity is full or if your vehicle
              is already connected to ABRP.
            </p>
          </div>
        </div>
      </div>

      {/* What data is available */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Available Data</h2>
        <p className="text-gray-700 mb-3">
          The data available depends on what your vehicle&apos;s manufacturer API sends to ABRP.
          Typically you will get:
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>Battery level (SOC)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>Charging status</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>Voltage &amp; current</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>Battery temperature</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>Odometer</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>State of Health (SOH)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>Charge power</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>Brand &amp; model</span>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> GPS location is generally <strong>not available</strong> through
            ABRP API. Location data shown on the ABRP website comes from your phone&apos;s browser,
            not from the vehicle API.
          </p>
        </div>
      </section>

      {/* Prerequisites */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Prerequisites</h2>
        <ul className="list-disc ml-6 space-y-1 text-gray-700">
          <li>An EVConduit account</li>
          <li>
            An{' '}
            <a
              href="https://abetterrouteplanner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              ABRP account
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            with your vehicle connected as a live data source (see below)
          </li>
        </ul>
      </section>

      {/* ABRP connection methods */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Connecting Your Vehicle to ABRP</h2>
        <p className="text-gray-700 mb-4">
          Before you can pull data through EVConduit, your vehicle needs to be sending live data to ABRP.
          There are two ways to do this:
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Option A: Enode Link</h3>
            <p className="text-sm text-gray-600 mb-2">
              ABRP has its own Enode integration (found in ABRP settings under &quot;Live Data Source&quot;).
              This connects to your car manufacturer&apos;s cloud API (e.g. XPENG, Tesla, etc.)
              to pull vehicle telemetry automatically.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-800">
              <strong>Requires ABRP Premium subscription</strong> — this is an ABRP requirement, not EVConduit.
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Option B: OBD-II Adapter</h3>
            <p className="text-sm text-gray-600 mb-2">
              Use a Bluetooth OBD-II adapter (e.g. OBDLink, Vgate) paired with the ABRP app on your phone.
              The adapter reads data directly from your vehicle&apos;s diagnostic port.
            </p>
            <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
              <strong>No ABRP Premium required</strong> — works with a free ABRP account.
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-3">
          Both methods provide the same data to EVConduit. The OBD-II option may provide additional data
          points (like tire pressure and cabin temperature) depending on your vehicle and adapter.
        </p>
      </section>

      {/* Step 1 - Token based (primary) */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">1</span>
          <h2 className="text-xl font-semibold text-gray-800">Get Your ABRP Token</h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>
            Log in to{' '}
            <a
              href="https://abetterrouteplanner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              abetterrouteplanner.com
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            and get your user token from your account settings:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Click your <strong>profile icon</strong> → <strong>Settings</strong></li>
            <li>Look for <strong>Integrations</strong> or <strong>API Tokens</strong></li>
            <li>Copy your <strong>user token</strong></li>
          </ol>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-green-800">
              This is the recommended method. Your token does not expire and gives EVConduit
              official API access to read your vehicle telemetry.
            </p>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">2</span>
          <h2 className="text-xl font-semibold text-gray-800">Configure in EVConduit</h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Go to your{' '}
              <a href="/profile#abrp-pull" className="text-indigo-600 hover:underline">
                EVConduit Profile → ABRP API Settings
              </a>
            </li>
            <li>Paste your <strong>ABRP Token</strong></li>
            <li>Click <strong>Save</strong></li>
            <li>Click <strong>Discover Vehicles</strong> to find your ABRP vehicles</li>
            <li>Click <strong>Pull &amp; Save Vehicles</strong> to verify the connection</li>
            <li>Toggle <strong>Enable ABRP API</strong> to turn on automatic polling</li>
          </ol>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-green-800">
              Once enabled, EVConduit will automatically pull your vehicle data from ABRP
              every <strong>60 seconds</strong>. If the same car is also linked via Enode, data
              from both sources will be merged automatically.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          How It Works
        </h2>
        <div className="space-y-3 text-gray-700">
          <ul className="list-disc ml-6 space-y-2">
            <li>
              EVConduit polls the ABRP API every 60 seconds using your token
            </li>
            <li>
              Vehicle data is normalised and stored in the same format as Enode vehicles
            </li>
            <li>
              ABRP vehicles appear on your Dashboard alongside any Enode-connected vehicles
            </li>
            <li>
              If the same car is connected via both Enode and ABRP, EVConduit automatically
              <strong> cross-populates</strong> missing data — e.g. ABRP enriches Enode with odometer,
              SOH, tire pressures and battery capacity, while Enode enriches ABRP with VIN and charge limits
            </li>
            <li>
              You can also manually refresh from the Dashboard using the <strong>Refresh from ABRP</strong> button
            </li>
          </ul>
        </div>
      </section>

      {/* Legacy credentials */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="text-xl font-semibold text-gray-800">Legacy Credentials (Advanced)</h2>
        </div>
        <div className="space-y-3 text-gray-700">
          <p>
            If you cannot obtain an ABRP user token, you can alternatively use legacy credentials
            extracted from your browser&apos;s developer tools. This method requires a <strong>Session ID</strong>,
            <strong> API Key</strong>, and <strong>Vehicle ID</strong>.
          </p>
          <p>
            These credentials are available under the <strong>Advanced (Legacy Credentials)</strong> section
            in your ABRP API settings card. Note that session tokens <strong>expire</strong> periodically
            and will need to be refreshed.
          </p>
          <details className="border border-gray-200 rounded-lg">
            <summary className="cursor-pointer p-3 font-medium text-sm text-gray-700 hover:bg-gray-50">
              How to extract legacy credentials from browser dev tools
            </summary>
            <ol className="p-3 pt-0 space-y-2 list-decimal list-inside text-sm">
              <li>Open <strong>Developer Tools</strong> (press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">F12</kbd> or right-click → Inspect)</li>
              <li>Go to the <strong>Network</strong> tab</li>
              <li>In the filter bar, type <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">get_tlm</code></li>
              <li>Refresh the ABRP page or wait for a request to appear</li>
              <li>Click on the <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">get_tlm</code> request</li>
              <li><strong>API Key</strong>: from the <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">Authorization: APIKEY ...</code> header</li>
              <li><strong>Session ID</strong>: from the request body <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">session_id</code></li>
              <li><strong>Vehicle ID</strong>: from the request body <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">wakeup_vehicle_id</code></li>
            </ol>
          </details>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Can I use ABRP API and Enode at the same time?</h3>
            <p className="text-sm text-gray-600">
              Yes. You can have some vehicles connected via Enode and others via ABRP API.
              They appear side by side on your dashboard. Each vehicle shows a source badge
              (Enode or ABRP) so you can tell them apart.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">What if I connect the same car via both Enode and ABRP?</h3>
            <p className="text-sm text-gray-600">
              EVConduit will detect they are the same vehicle (by matching brand) and automatically
              merge the data. Your Enode vehicle gets enriched with ABRP-only data like SOH,
              voltage, tire pressures, and odometer. Your ABRP vehicle gets enriched with Enode-only
              data like VIN, charge limit, and range. This gives you the most complete view of your
              vehicle from either source.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Does ABRP API count against my Enode vehicle limit?</h3>
            <p className="text-sm text-gray-600">
              No. ABRP API completely bypasses Enode, so it does not use any Enode vehicle slots.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Will my vehicle show location data?</h3>
            <p className="text-sm text-gray-600">
              Generally no. The ABRP API provides telemetry data (battery, charging, etc.) but
              GPS coordinates are typically not included. Some vehicles may report location when
              actively driving, but this is not guaranteed.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">How often does the data update?</h3>
            <p className="text-sm text-gray-600">
              EVConduit polls ABRP every 60 seconds. The freshness of the underlying data depends
              on how often your vehicle reports to ABRP (typically via the manufacturer&apos;s cloud API
              or an OBD dongle).
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Does it work with Home Assistant?</h3>
            <p className="text-sm text-gray-600">
              ABRP vehicles are stored and displayed on your EVConduit dashboard, but they are
              not pushed to Home Assistant directly. HA webhook pushes use the Enode vehicle ID.
              If you have the same car connected via both Enode and ABRP, EVConduit will
              automatically merge the data — enriching your Enode vehicle with ABRP-only data
              like odometer, SOH, tire pressures, and more.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Is there a cost?</h3>
            <p className="text-sm text-gray-600">
              No additional cost for ABRP API. It works on both Free and Pro tiers.
              However, a Pro subscription is still required for real-time webhook pushes to
              Home Assistant.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
