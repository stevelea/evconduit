'use client';

import { CodeBlock } from '@/components/CodeBlock';

export default function IntegrationGuidePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      {/* Hardcoded string */}
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">EVConduit Integration Guide</h1>

      <section className="space-y-6">
        {/* Hardcoded string */}
        <p>Follow these steps to connect your EV to EVConduit and Home Assistant.</p>

        {/* Hardcoded string */}
        <h2 className="text-2xl font-semibold">1. Create an Account</h2>
        <ul className="list-disc ml-6">
          {/* Hardcoded string */}
          <li>Go to <a href="https://evconduit.com/register" className="text-blue-600 underline">evconduit.com/register</a></li>
          {/* Hardcoded string */}
          <li>Log in using Magic Link or GitHub</li>
        </ul>

        {/* Hardcoded string */}
        <h2 className="text-2xl font-semibold">2. Create API Key</h2>
        <ul className="list-disc ml-6">
          {/* Hardcoded string */}
          <li>Go to your <a href="https://evconduit.com/profile" className="text-blue-600 underline">Profile</a></li>
          {/* Hardcoded string */}
          <li>Click <strong>&quot;Create API Key&quot;</strong> and copy the key</li>
        </ul>

        <h2 className="text-2xl font-semibold">3. Link Your Vehicle</h2>
        <p className="mb-2">There are two ways to connect your vehicle:</p>

        <h3 className="text-lg font-semibold mt-4 mb-2">Option A: Via Enode (Recommended)</h3>
        <ul className="list-disc ml-6">
          <li>Go to the Dashboard</li>
          <li>Click <strong>&quot;Link Vehicle with Enode&quot;</strong> and follow the manufacturer&apos;s login</li>
          <li>We support most major EV brands including: Tesla, BMW, Mercedes, Audi, VW, Skoda, Seat, Cupra, Polestar, Volvo, Hyundai, Kia, Nissan, Renault, Peugeot, Citroën, Opel, Ford, GM, and more</li>
          <li>After linking, click <strong>&quot;Copy ID&quot;</strong> to get the Vehicle ID (Not needed for HACS integration)</li>
        </ul>

        <h3 className="text-lg font-semibold mt-4 mb-2">Option B: Via ABRP API</h3>
        <ul className="list-disc ml-6">
          <li>If Enode capacity is full, or your vehicle is already connected to ABRP, you can pull data from <strong>A Better Route Planner</strong> instead</li>
          <li>Click <strong>&quot;Link Vehicle with ABRP&quot;</strong> on the Dashboard, or go to your <a href="/profile#abrp-pull" className="text-blue-600 underline">Profile → ABRP API Settings</a></li>
          <li>See the <a href="/docs/abrp-pull" className="text-blue-600 underline">ABRP API Guide</a> for full setup instructions</li>
        </ul>

        {/* Hardcoded string */}
        <h2 className="text-2xl font-semibold">4. Configure Home Assistant</h2>

        {/* ------------------------------------------------------------------ */}
        {/* HACS Installation Guide */}
        {/* ------------------------------------------------------------------ */}
        <div className='mt-16 border-t pt-6'>
          <h2 className='text-2xl font-semibold'>HACS Installation (Recommended)</h2>
          <p className='mt-2'>
            For the easiest integration, install EVConduit directly through Home Assistant Community Store (HACS):
          </p>          
          <ol className='list-decimal ml-6 space-y-2 mt-4'>
            <li>Open Home Assistant</li>
            <li>Go to <strong>HACS → Integrations</strong></li>
            <li>Search for <strong>&quot;EVConduit&quot;</strong></li>
            <li>If not found, add custom repository:</li>
            <ul className='list-disc ml-6'>
              <li>Click the three dots in top right of HACS</li>
              <li>Select <strong>&quot;Custom repositories&quot;</strong></li>
              <li>Enter: <code>https://github.com/stevelea/evconduit-homeassistant</code></li>
              <li>Category: <strong>Integration</strong></li>
            </ul>
            <li>Install the integration</li>
            <li>Restart Home Assistant</li>
            <li>Go to <strong>Settings → Devices & Services</strong></li>
            <li>Add integration & search for <strong>&quot;EVConduit&quot;</strong></li>
            <li>Enter your API key and Vehicle ID</li>
          </ol>

          <div className='bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded mt-4'>
            <strong>✅ Benefits of HACS Installation:</strong>
            <ul className='list-disc ml-6 mt-2'>
              <li>No manual YAML configuration required</li>
              <li>Easy setup through UI</li>
              <li>Automatic updates</li>
              <li>Built-in error handling</li>
              <li>Webhook support for real-time updates (Pro tier)</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded">
          {/* Hardcoded string */}
          ⚠️ <strong>Rate limit recommendations:</strong>
          {/* Hardcoded string */}
          <p className="mt-1">
            <strong>Free tier</strong> (300 calls per 30 days): set <code>scan_interval</code> to at least <strong>9000</strong> seconds (2.5 hours).
          </p>
          {/* Hardcoded string */}
          <p>
            <strong>Pro tier</strong> (10,000 calls per 30 days): set <code>scan_interval</code> to at least <strong>300</strong> seconds (5 minutes).
          </p>
          {/* Hardcoded string */}
          <p className="mt-2">
            Choose the interval that matches your subscription to avoid hitting rate limits.
          </p>
          {/* Hardcoded string */}
          <p>
            If you exceed these limits, the API will return a <code>429 Too Many Requests</code> response.
          </p>
        </div>


        {/* Hardcoded string */}
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded mb-6">
          <strong>🚀 Pro Tier Webhook Feature:</strong>
          <p className="mt-1">
            Pro tier users can receive real-time webhook notifications directly to their Home Assistant instance. This eliminates the need for polling and provides instant updates when your vehicle&apos;s state changes.
          </p>
          <p className="mt-2">
            <strong>Setup:</strong> The HACS integration handles webhook registration automatically using your Home Assistant external URL
            (configured in Settings → System → Network). No manual configuration is needed on the EVConduit profile page —
            the <strong>External URL</strong> and <strong>Webhook ID</strong> fields are populated by the integration on startup.
          </p>
        </div>
        {/* Hardcoded string */}
        <h2 className="text-xl font-semibold">Alternative to HACS component</h2>
        <h3 className="text-xl font-semibold">secrets.yaml</h3>
        <CodeBlock
          code={`evlink_api_key: "Bearer <API_CODE>"
evlink_status_url: "https://api.evconduit.cloud/api/ha/status/<VEHICLE_ID>"`}
        />

        {/* Hardcoded string */}
        <h3 className="text-xl font-semibold">configuration.yaml</h3>
        <CodeBlock
          code={`sensor:
  - platform: rest
    name: "EVLink Location"
    unique_id: "evlink_vehicle_location"
    resource: !secret evlink_status_url
    method: GET
    headers:
      Authorization: !secret evlink_api_key
    value_template: "ok"
    scan_interval: 300
    json_attributes:
      - latitude
      - longitude

  - platform: rest
    name: "EVLink Vehicle"
    unique_id: "evlink_vehicle_sensor"
    resource: !secret evlink_status_url
    method: GET
    headers:
      Authorization: !secret evlink_api_key
    value_template: "{{ value_json.batteryLevel }}"
    unit_of_measurement: "%"
    scan_interval: 300
    json_attributes:
      - range
      - isCharging
      - isPluggedIn
      - chargingState
      - vehicleName

template:
  - sensor:
      - name: "EV Battery Level"
        state: "{{ states('sensor.evlink_vehicle') }}"
        
        
      - name: "EV Battery Range"
        unique_id: "evlink_battery_range"
        unit_of_measurement: "km"
        state: "{{ state_attr('sensor.evlink_vehicle', 'range') }}"

      - name: "EV Charging State"
        unique_id: "evlink_charging_state"
        state: "{{ state_attr('sensor.evlink_vehicle', 'chargingState') }}"

      - name: "EV Vehicle Name"
        unique_id: "evlink_vehicle_name"
        state: "{{ state_attr('sensor.evlink_vehicle', 'vehicleName') }}"

  - binary_sensor:
      - name: "EV Is Charging"
        unique_id: "evlink_is_charging"
        state: "{{ state_attr('sensor.evlink_vehicle', 'isCharging') }}"
        device_class: battery_charging

      - name: "EV Is Plugged In"
        unique_id: "evlink_is_plugged_in"
        state: "{{ state_attr('sensor.evlink_vehicle', 'isPluggedIn') }}"
        device_class: plug`}
          language="yaml"
        />

        <h2 className="text-2xl font-semibold">6. Verify in Home Assistant</h2>
        <ul className="list-disc ml-6">
          {/* Hardcoded string */}
          <li>Go to <strong>Developer Tools → States</strong></li>
          {/* Hardcoded string */}
          <li>Search for <code>sensor.evlink_battery_level</code> etc.</li>
          {/* Hardcoded string */}
          <li>Ensure values update according to your tier allowance</li>
        </ul>

        {/* ABRP Integration Section */}
        <div className="mt-16 border-t pt-6">
          <h2 className="text-2xl font-semibold">ABRP Integration (A Better Route Planner)</h2>
          <p className="mt-2">
            EVConduit can automatically send your vehicle&apos;s live telemetry data to{' '}
            <a href="https://abetterrouteplanner.com/" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              A Better Route Planner (ABRP)
            </a>{' '}
            for accurate route planning with real-time battery information.
          </p>

          <h3 className="text-xl font-semibold mt-6">Prerequisites</h3>
          <ul className="list-disc ml-6">
            <li>EVConduit configured in Home Assistant (steps above)</li>
            <li>ABRP app installed on your phone</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6">Step 1: Get Your ABRP Generic Token</h3>
          <ol className="list-decimal ml-6 space-y-2 mt-2">
            <li>Open the <strong>ABRP app</strong> on your phone or visit <a href="https://abetterrouteplanner.com" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">abetterrouteplanner.com</a> on your computer (easier to copy the token)</li>
            <li>Go to your vehicle settings and find <strong>Connections</strong> (or Live Data settings)</li>
            <li>Under <strong>In-car live data</strong>, find the <strong>Generic</strong> option and tap <strong>Link</strong></li>
          </ol>
          <div className="my-4">
            <img
              src="/docs/images/ABRPToken.png"
              alt="ABRP Connections Screen"
              className="rounded-lg border border-gray-300 max-w-md"
            />
          </div>
          <ol className="list-decimal ml-6 space-y-2" start={4}>
            <li>ABRP will generate a <strong>Generic Token</strong> for your vehicle</li>
            <li>Tap <strong>Copy Token</strong> to copy it to your clipboard</li>
          </ol>
          <div className="my-4">
            <img
              src="/docs/images/ABRPGeneric.png"
              alt="ABRP Generic Token"
              className="rounded-lg border border-gray-300 max-w-md"
            />
          </div>

          <h3 className="text-xl font-semibold mt-6">Step 2: Configure EVConduit in Home Assistant</h3>
          <ol className="list-decimal ml-6 space-y-2 mt-2">
            <li>In Home Assistant, go to <strong>Settings → Devices & Services</strong></li>
            <li>Find <strong>EVConduit</strong> and click on it</li>
            <li>Click the <strong>three-dot menu</strong> (⋮) and select <strong>Reconfigure</strong></li>
          </ol>
          <div className="my-4">
            <img
              src="/docs/images/Reconfigure.png"
              alt="EVConduit Reconfigure Menu"
              className="rounded-lg border border-gray-300 max-w-full"
            />
          </div>
          <ol className="list-decimal ml-6 space-y-2" start={4}>
            <li>In the reconfigure dialog, paste your <strong>ABRP Token</strong> in the &quot;ABRP Token (optional)&quot; field</li>
            <li>Click <strong>Submit</strong></li>
          </ol>
          <div className="my-4">
            <img
              src="/docs/images/reconfigure2.png"
              alt="EVConduit Reconfigure Dialog"
              className="rounded-lg border border-gray-300 max-w-md"
            />
          </div>

          <h3 className="text-xl font-semibold mt-6">Step 3: Verify ABRP Connection</h3>
          <ul className="list-disc ml-6">
            <li>Open the ABRP app and start planning a route</li>
            <li>You should see live battery data from your vehicle</li>
            <li>The data updates automatically when your vehicle state changes</li>
          </ul>

          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded mt-4">
            <strong>💡 Tip:</strong> You can also configure ABRP directly in EVConduit&apos;s web interface at{' '}
            <a href="https://evconduit.com/profile" className="underline">evconduit.com/profile</a>{' '}
            under the ABRP Integration section.
          </div>
        </div>

        {/* Charging Cost Tracking Section */}
        <div className="mt-16 border-t pt-6">
          <h2 className="text-2xl font-semibold">Charging Cost Tracking</h2>
          <p className="mt-2">
            EVConduit can automatically calculate the cost of your home charging sessions using your real electricity rate.
            When a session completes at your home location, costs are calculated using the rate history — including granular
            time-based breakdowns for time-of-use tariffs.
          </p>

          <h3 className="text-xl font-semibold mt-6">How It Works</h3>
          <ol className="list-decimal ml-6 space-y-2 mt-2">
            <li>
              <strong>Set your home location</strong> — Go to your{' '}
              <a href="/profile" className="text-blue-600 underline">Profile</a> and set your home
              coordinates (use &quot;Detect Location&quot; for easy setup) and radius
            </li>
            <li>
              <strong>Push your electricity rate</strong> — The EVConduit HACS integration (v1.8.0+)
              automatically pushes your rate sensor to EVConduit on change and every 5 minutes
            </li>
            <li>
              <strong>Charge at home</strong> — When a session completes within your home radius,
              EVConduit automatically calculates costs using the rate history
            </li>
          </ol>

          <h3 className="text-xl font-semibold mt-6">Setting Up Automatic Rate Push (HACS Integration)</h3>
          <ol className="list-decimal ml-6 space-y-2 mt-2">
            <li>Update the EVConduit HACS integration to <strong>v1.8.0</strong> or later</li>
            <li>Go to <strong>Settings → Devices &amp; Services → EVConduit → Configure</strong></li>
            <li>Set the <strong>Electricity rate sensor</strong> to your rate entity (e.g. <code>sensor.electricity_price</code>,
              {' '}<code>sensor.amber_general_price</code>, or a template sensor)</li>
            <li>The <strong>Currency</strong> is auto-detected from your HA settings — override if needed</li>
            <li>Save — the integration pushes the current rate immediately and then on every change</li>
          </ol>

          <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded mt-4">
            <strong>✅ What you get:</strong>
            <ul className="list-disc ml-6 mt-2">
              <li>Automatic cost calculation for home charging sessions</li>
              <li>Time-based cost breakdown showing energy consumed at each rate</li>
              <li>Weighted average cost per kWh across the session</li>
              <li>Works with time-of-use tariffs, real-time pricing (Amber), and fixed rates</li>
              <li>You can always override auto-calculated costs manually in the session detail page</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mt-6">Alternative: Manual Rate Entry</h3>
          <p className="mt-2">
            If you don&apos;t use the HACS integration, you can set your electricity rate manually on the{' '}
            <a href="/profile" className="text-blue-600 underline">Profile</a> page, or push it via REST API.
            See the <a href="/docs/ha-api" className="text-blue-600 underline">HA API docs</a> for details.
          </p>
        </div>

        {/* Solar + EVCC True Cost Section */}
        <div className="mt-16 border-t pt-6">
          <h2 className="text-2xl font-semibold">Solar Charging with EVCC — True Cost Tracking</h2>
          <p className="mt-2">
            If you charge your EV with solar panels and use{' '}
            <a href="https://evcc.io" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">EVCC</a>{' '}
            for solar surplus charging, your charger reports total kWh delivered — but what did that energy actually cost you?
            If 80% came from solar, you only paid for 20% from the grid.
          </p>
          <p className="mt-2">
            These Home Assistant template sensors combine EVCC&apos;s solar tracking with your electricity rates
            to calculate the true cost of each charging session.
          </p>

          <h3 className="text-xl font-semibold mt-6">How Solar Cost Calculation Works</h3>
          <div className="bg-gray-50 border rounded p-4 mt-2 font-mono text-sm overflow-x-auto">
            <pre>{`Solar Panels ──▶ EVCC tracks ──▶ Template sensors
(free energy)    solar % of      combine with your
                 each session     retailer rates
Grid         ──▶ Grid % =    ──▶ True Cost =
(you pay)        100% - solar%    grid% × rate`}</pre>
          </div>

          <h3 className="text-xl font-semibold mt-6">Two Ways to Think About Solar Cost</h3>

          <div className="mt-4 space-y-4">
            <div className="bg-green-50 border rounded p-4">
              <strong>1. True Cost (solar = $0)</strong> — recommended
              <p className="mt-1 text-sm">
                Solar energy is free because your panels are a sunk cost. You only pay for the grid portion.
              </p>
              <code className="block mt-2 text-sm bg-white p-2 rounded">
                True Cost per kWh = (1 - solar%) × grid_rate<br />
                Example: 80% solar, grid rate $0.33/kWh → 0.20 × $0.33 = <strong>$0.066/kWh</strong>
              </code>
            </div>

            <div className="bg-yellow-50 border rounded p-4">
              <strong>2. Opportunity Cost (solar = feed-in rate)</strong>
              <p className="mt-1 text-sm">
                Every kWh of solar put into the car is a kWh you didn&apos;t export for the feed-in tariff.
              </p>
              <code className="block mt-2 text-sm bg-white p-2 rounded">
                Opportunity Cost = (1 - solar%) × grid_rate + solar% × feed_in_rate<br />
                Example: 80% solar, grid $0.33, feed-in $0.05 → $0.066 + $0.040 = <strong>$0.106/kWh</strong>
              </code>
            </div>
          </div>

          <h3 className="text-xl font-semibold mt-6">Template Sensors for True Cost</h3>
          <p className="mt-2">
            Add these sensors to your Home Assistant <code>template.yaml</code> (or <code>configuration.yaml</code> under
            {' '}<code>template:</code>). They use EVCC&apos;s session tracking with your electricity rate sensor.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-left">Sensor</th>
                  <th className="border px-3 py-2 text-left">What It Shows</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.ev_charging_instantaneous_true_cost</code></td>
                  <td className="border px-3 py-2">Current cost per kWh right now based on solar surplus vs charge power</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.ev_charging_session_effective_rate</code></td>
                  <td className="border px-3 py-2">Average cost per kWh for the current/last session using EVCC&apos;s solar %</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.ev_charging_session_solar_savings</code></td>
                  <td className="border px-3 py-2">Dollars saved by using solar instead of full grid rate</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.ev_charging_session_true_cost</code></td>
                  <td className="border px-3 py-2">Total dollars actually paid from the grid this session</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.ev_charging_cost_summary</code></td>
                  <td className="border px-3 py-2">Human-readable status, e.g. &quot;Charging: 80% solar @ $0.07/kWh&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mt-6">Example Template Sensors (template.yaml)</h3>
          <p className="mt-2">
            Copy these into your <code>template.yaml</code> file. Replace <code>garage</code> with your EVCC
            loadpoint name, and adjust the price sensor entity IDs to match your setup.
          </p>
          <CodeBlock
            code={`# EV Charging True Cost Sensors
# Combines EVCC solar tracking with your electricity rates.
# Replace "garage" with your EVCC loadpoint name.
# Replace price sensors with your own (Amber, fixed rate, etc.)

- sensor:
    # --- Instantaneous True Cost ---
    # What the current kWh costs RIGHT NOW based on solar surplus.
    - name: "EV Charging Instantaneous True Cost"
      unique_id: ev_charging_instantaneous_true_cost
      state_class: measurement
      unit_of_measurement: "AUD/kWh"
      icon: mdi:currency-usd
      availability: "{{ is_state('binary_sensor.evcc_garage_charging', 'on') }}"
      state: >
        {% set charge_power = states('sensor.evcc_garage_charge_power') | float(0) %}
        {% set available_solar = states('sensor.available_solar_power_for_evcc') | float(0) %}
        {% set grid_rate = states('sensor.house_current_grid_price') | float(0) %}
        {% if charge_power > 0 %}
          {% set solar_portion = ([available_solar, charge_power] | min) / charge_power %}
          {% set grid_portion = 1 - solar_portion %}
          {{ (grid_portion * grid_rate) | round(4) }}
        {% else %}
          0
        {% endif %}
      attributes:
        charge_power_w: "{{ states('sensor.evcc_garage_charge_power') | float(0) | round(0) }}"
        available_solar_w: "{{ states('sensor.available_solar_power_for_evcc') | float(0) | round(0) }}"
        solar_portion_pct: >
          {% set charge_power = states('sensor.evcc_garage_charge_power') | float(0) %}
          {% set available_solar = states('sensor.available_solar_power_for_evcc') | float(0) %}
          {% if charge_power > 0 %}
            {{ (([available_solar, charge_power] | min) / charge_power * 100) | round(1) }}
          {% else %}0{% endif %}
        description: >
          {% set charge_power = states('sensor.evcc_garage_charge_power') | float(0) %}
          {% set available_solar = states('sensor.available_solar_power_for_evcc') | float(0) %}
          {% if charge_power <= 0 %}Not charging
          {% elif available_solar >= charge_power %}100% solar - FREE
          {% elif available_solar > 0 %}Partially solar ({{ ((available_solar / charge_power) * 100) | round(0) }}%)
          {% else %}100% grid{% endif %}

    # --- Session Effective Rate ---
    # Average cost/kWh for current session using EVCC's solar %.
    # This is the sensor to push to EVConduit for true cost tracking.
    - name: "EV Charging Session Effective Rate"
      unique_id: ev_charging_session_effective_rate
      state_class: measurement
      unit_of_measurement: "AUD/kWh"
      icon: mdi:ev-station
      availability: >
        {{ states('sensor.evcc_garage_session_energy') | float(0) > 0 }}
      state: >
        {% set solar_pct = states('sensor.evcc_garage_session_solar_percentage') | float(0) / 100 %}
        {% set grid_pct = 1 - solar_pct %}
        {% set grid_rate = states('sensor.house_current_grid_price') | float(0) %}
        {{ (grid_pct * grid_rate) | round(4) }}
      attributes:
        session_solar_pct: "{{ states('sensor.evcc_garage_session_solar_percentage') | float(0) | round(1) }}%"
        session_energy_kwh: "{{ states('sensor.evcc_garage_session_energy') | float(0) | round(2) }}"
        evcc_reported_rate: "{{ states('sensor.evcc_garage_session_price_per_kwh') }}"
        opportunity_cost_per_kwh: >
          {% set solar_pct = states('sensor.evcc_garage_session_solar_percentage') | float(0) / 100 %}
          {% set grid_pct = 1 - solar_pct %}
          {% set grid_rate = states('sensor.house_current_grid_price') | float(0) %}
          {% set feed_in = states('sensor.house_current_feed_in_price') | float(0) %}
          {{ (grid_pct * grid_rate + solar_pct * feed_in) | round(4) }}

    # --- Session Solar Savings ---
    # Dollars saved by using solar instead of grid this session.
    - name: "EV Charging Session Solar Savings"
      unique_id: ev_charging_session_solar_savings
      state_class: measurement
      unit_of_measurement: "AUD"
      icon: mdi:piggy-bank-outline
      availability: >
        {{ states('sensor.evcc_garage_session_energy') | float(0) > 0 }}
      state: >
        {% set solar_pct = states('sensor.evcc_garage_session_solar_percentage') | float(0) / 100 %}
        {% set energy = states('sensor.evcc_garage_session_energy') | float(0) %}
        {% set grid_rate = states('sensor.house_current_grid_price') | float(0) %}
        {% set solar_kwh = energy * solar_pct %}
        {{ (solar_kwh * grid_rate) | round(2) }}
      attributes:
        solar_kwh: >
          {% set solar_pct = states('sensor.evcc_garage_session_solar_percentage') | float(0) / 100 %}
          {% set energy = states('sensor.evcc_garage_session_energy') | float(0) %}
          {{ (energy * solar_pct) | round(2) }}
        grid_kwh: >
          {% set solar_pct = states('sensor.evcc_garage_session_solar_percentage') | float(0) / 100 %}
          {% set energy = states('sensor.evcc_garage_session_energy') | float(0) %}
          {{ (energy * (1 - solar_pct)) | round(2) }}
        would_have_cost: >
          {% set energy = states('sensor.evcc_garage_session_energy') | float(0) %}
          {% set grid_rate = states('sensor.house_current_grid_price') | float(0) %}
          \${{ (energy * grid_rate) | round(2) }} if 100% grid

    # --- Session True Total Cost ---
    # Total dollars actually paid from grid this session.
    - name: "EV Charging Session True Cost"
      unique_id: ev_charging_session_true_cost
      state_class: measurement
      unit_of_measurement: "AUD"
      icon: mdi:cash-minus
      availability: >
        {{ states('sensor.evcc_garage_session_energy') | float(0) > 0 }}
      state: >
        {% set solar_pct = states('sensor.evcc_garage_session_solar_percentage') | float(0) / 100 %}
        {% set grid_pct = 1 - solar_pct %}
        {% set energy = states('sensor.evcc_garage_session_energy') | float(0) %}
        {% set grid_rate = states('sensor.house_current_grid_price') | float(0) %}
        {{ (energy * grid_pct * grid_rate) | round(2) }}

    # --- Charging Cost Summary ---
    # Human-readable summary of current charging economics.
    - name: "EV Charging Cost Summary"
      unique_id: ev_charging_cost_summary
      icon: mdi:information-outline
      state: >
        {% set charging = is_state('binary_sensor.evcc_garage_charging', 'on') %}
        {% set session_energy = states('sensor.evcc_garage_session_energy') | float(0) %}
        {% if charging %}
          {% set solar_pct = states('sensor.evcc_garage_session_solar_percentage') | float(0) %}
          {% set grid_rate = states('sensor.house_current_grid_price') | float(0) %}
          {% set effective = ((1 - solar_pct / 100) * grid_rate) %}
          Charging: {{ solar_pct | round(0) }}% solar @ \${{ effective | round(2) }}/kWh
        {% elif session_energy > 0 %}
          {% set solar_pct = states('sensor.evcc_garage_session_solar_percentage') | float(0) %}
          Last session: {{ session_energy | round(1) }}kWh ({{ solar_pct | round(0) }}% solar)
        {% else %}
          Not charging
        {% endif %}
      attributes:
        is_charging: "{{ is_state('binary_sensor.evcc_garage_charging', 'on') }}"
        stat_30d_solar_pct: "{{ states('sensor.evcc_stat30_solar_percentage') | float(0) | round(1) }}%"
        stat_30d_avg_price: "\${{ states('sensor.evcc_stat30_avg_price') | float(0) | round(2) }}/kWh"
        stat_total_solar_pct: "{{ states('sensor.evcc_stat_total_solar_percentage') | float(0) | round(1) }}%"
        stat_total_avg_price: "\${{ states('sensor.evcc_stat_total_avg_price') | float(0) | round(2) }}/kWh"`}
            language="yaml"
          />

          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded mt-4">
            <strong>Adapt for your setup:</strong>
            <ul className="list-disc ml-6 mt-2">
              <li>Replace <code>sensor.house_current_grid_price</code> with your grid rate sensor
                (e.g. <code>sensor.amber_general_price</code>, or a fixed-rate template)</li>
              <li>Replace <code>sensor.house_current_feed_in_price</code> with your feed-in rate sensor</li>
              <li>Replace <code>sensor.available_solar_power_for_evcc</code> with your solar surplus sensor</li>
              <li>Replace <code>evcc_garage_</code> with your EVCC loadpoint name (e.g. <code>evcc_carport_</code>)</li>
              <li>Change <code>AUD</code> to your currency code</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mt-6">Pushing True Cost to EVConduit</h3>
          <p className="mt-2">
            To get accurate cost tracking in EVConduit with solar, configure the EVConduit HACS integration
            to push your <strong>effective rate sensor</strong> instead of your raw grid rate:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              <strong>Without solar tracking:</strong> Set rate entity to your grid price sensor
              (e.g. <code>sensor.amber_general_price</code>)
            </li>
            <li>
              <strong>With solar tracking:</strong> Set rate entity to{' '}
              <code>sensor.ev_charging_session_effective_rate</code> — this reflects your true cost
              accounting for solar, so EVConduit&apos;s auto-calculated session costs will be accurate
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-6">Typical Savings</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-left">Scenario</th>
                  <th className="border px-3 py-2 text-right">Grid Rate</th>
                  <th className="border px-3 py-2 text-right">Solar %</th>
                  <th className="border px-3 py-2 text-right">True Cost/kWh</th>
                  <th className="border px-3 py-2 text-right">Savings</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2">Midday PV mode</td>
                  <td className="border px-3 py-2 text-right">$0.42</td>
                  <td className="border px-3 py-2 text-right">90%</td>
                  <td className="border px-3 py-2 text-right font-semibold text-green-700">$0.042</td>
                  <td className="border px-3 py-2 text-right">90%</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Afternoon PV mode</td>
                  <td className="border px-3 py-2 text-right">$0.42</td>
                  <td className="border px-3 py-2 text-right">60%</td>
                  <td className="border px-3 py-2 text-right font-semibold text-green-700">$0.168</td>
                  <td className="border px-3 py-2 text-right">60%</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Evening grid</td>
                  <td className="border px-3 py-2 text-right">$0.51</td>
                  <td className="border px-3 py-2 text-right">0%</td>
                  <td className="border px-3 py-2 text-right">$0.510</td>
                  <td className="border px-3 py-2 text-right">0%</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Overnight EV saver</td>
                  <td className="border px-3 py-2 text-right">$0.08</td>
                  <td className="border px-3 py-2 text-right">0%</td>
                  <td className="border px-3 py-2 text-right font-semibold text-green-700">$0.080</td>
                  <td className="border px-3 py-2 text-right">84% vs peak</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mt-6">EVCC Sensors Required</h3>
          <p className="mt-2">
            These sensors are created by the{' '}
            <a href="https://github.com/marq24/ha-evcc" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              ha-evcc
            </a>{' '}
            custom integration. Replace <code>garage</code> with your EVCC loadpoint name.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-left">Sensor</th>
                  <th className="border px-3 py-2 text-left">Provides</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.evcc_garage_session_solar_percentage</code></td>
                  <td className="border px-3 py-2">% of current session from solar</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.evcc_garage_session_energy</code></td>
                  <td className="border px-3 py-2">kWh charged this session</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.evcc_garage_charge_power</code></td>
                  <td className="border px-3 py-2">Current charging power (W)</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>binary_sensor.evcc_garage_charging</code></td>
                  <td className="border px-3 py-2">Whether currently charging</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mt-6">Dashboard Card</h3>
          <p className="mt-2">Add a Lovelace entities card to see charging economics at a glance:</p>
          <CodeBlock
            code={`type: entities
title: EV Charging Economics
entities:
  - entity: sensor.ev_charging_cost_summary
    name: Status
  - entity: sensor.ev_charging_instantaneous_true_cost
    name: Current Rate
  - entity: sensor.ev_charging_session_effective_rate
    name: Session Average Rate
  - entity: sensor.ev_charging_session_true_cost
    name: Session Cost
  - entity: sensor.ev_charging_session_solar_savings
    name: Session Savings
  - entity: sensor.evcc_garage_session_solar_percentage
    name: Solar %`}
            language="yaml"
          />

          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded mt-4">
            <strong>💡 Tip:</strong> If you don&apos;t use EVCC/solar, you can still get accurate cost tracking
            by simply pointing the EVConduit integration at your grid electricity rate sensor. The auto-cost
            calculation works with any rate source — fixed, time-of-use, or real-time.
          </div>
        </div>

        {/* Charging History in Home Assistant */}
        <div className="mt-16 border-t pt-6">
          <h2 className="text-2xl font-semibold">Charging History in Home Assistant</h2>
          <p className="mt-2">
            EVConduit can sync your complete charging session history to Home Assistant&apos;s local storage.
            This gives you sensors for your last charge, monthly totals, and a full session list accessible
            from Lovelace cards and templates — all stored locally so it survives HA restarts.
          </p>

          <h3 className="text-xl font-semibold mt-6">How It Works</h3>
          <ol className="list-decimal ml-6 space-y-2 mt-2">
            <li>
              <strong>Incremental sync</strong> — On first enable, all sessions are fetched. After that, only
              new sessions since the last sync are pulled.
            </li>
            <li>
              <strong>Automatic</strong> — Syncs piggyback on your vehicle poll interval (throttled to every 15 minutes)
            </li>
            <li>
              <strong>Persistent</strong> — Session data is stored in HA&apos;s <code>.storage/</code> directory
              and survives restarts
            </li>
            <li>
              <strong>Manual trigger</strong> — Call <code>evconduit.sync_charging_history</code> service anytime
            </li>
          </ol>

          <h3 className="text-xl font-semibold mt-6">Setup</h3>
          <ol className="list-decimal ml-6 space-y-2 mt-2">
            <li>Update the EVConduit HACS integration to <strong>v1.9.0</strong> or later</li>
            <li>Go to <strong>Settings &rarr; Devices &amp; Services &rarr; EVConduit &rarr; Configure</strong></li>
            <li>Enable the <strong>Charging history</strong> checkbox</li>
            <li>Click Submit — the integration will immediately sync all your sessions</li>
          </ol>

          <h3 className="text-xl font-semibold mt-6">Sensors Created</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-left">Sensor</th>
                  <th className="border px-3 py-2 text-left">Description</th>
                  <th className="border px-3 py-2 text-left">Unit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.evconduit_last_charge_energy</code></td>
                  <td className="border px-3 py-2">Energy added in last session</td>
                  <td className="border px-3 py-2">kWh</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.evconduit_last_charge_cost</code></td>
                  <td className="border px-3 py-2">Total cost of last session (currency in attributes)</td>
                  <td className="border px-3 py-2">—</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.evconduit_last_charge_location</code></td>
                  <td className="border px-3 py-2">Station name or &quot;Home&quot; (lat/lon in attributes)</td>
                  <td className="border px-3 py-2">—</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.evconduit_last_charge_date</code></td>
                  <td className="border px-3 py-2">Start timestamp of last session</td>
                  <td className="border px-3 py-2">—</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2"><code>sensor.evconduit_last_charge_duration</code></td>
                  <td className="border px-3 py-2">Duration of last session</td>
                  <td className="border px-3 py-2">min</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border px-3 py-2"><code>sensor.evconduit_monthly_charge_energy</code></td>
                  <td className="border px-3 py-2">Total energy added in last 30 days</td>
                  <td className="border px-3 py-2">kWh</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border px-3 py-2"><code>sensor.evconduit_monthly_charge_cost</code></td>
                  <td className="border px-3 py-2">Total cost in last 30 days (currencies in attributes)</td>
                  <td className="border px-3 py-2">—</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border px-3 py-2"><code>sensor.evconduit_monthly_charge_count</code></td>
                  <td className="border px-3 py-2">Number of sessions in last 30 days</td>
                  <td className="border px-3 py-2">sessions</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded mt-4">
            <strong>Tip:</strong> The <code>monthly_charge_count</code> sensor includes a <code>recent_sessions</code>
            attribute with the last 20 sessions (most recent first), each containing date, energy, cost, currency,
            location, battery levels, and duration. Use this in Markdown cards or templates.
          </div>

          <h3 className="text-xl font-semibold mt-6">Example: Charging History Markdown Card</h3>
          <p className="mt-2">
            Add this to a Lovelace dashboard to display your recent charging sessions as a table:
          </p>
          <CodeBlock
            code={`type: markdown
title: Recent Charging Sessions
content: >-
  | Date | Location | Energy | Cost | Duration |

  |------|----------|--------|------|----------|

  {% set sessions =
  state_attr('sensor.evconduit_monthly_charge_count',
  'recent_sessions') or [] %}

  {% for s in sessions[:10] %}

  | {{ s.date[:10] if s.date else '—' }} | {{ s.location }} | {{
  s.energy_kwh }} kWh | {{ s.cost }} {{ s.currency or '' }} | {{ s.duration_min
  | round(0) if s.duration_min else '—' }} min |

  {% endfor %}`}
            language="yaml"
          />

          <h3 className="text-xl font-semibold mt-6">Example: Monthly Summary Entities Card</h3>
          <CodeBlock
            code={`type: entities
title: EV Charging — Last 30 Days
entities:
  - entity: sensor.evconduit_monthly_charge_count
    name: Sessions
  - entity: sensor.evconduit_monthly_charge_energy
    name: Total Energy
  - entity: sensor.evconduit_monthly_charge_cost
    name: Total Cost
  - type: divider
  - entity: sensor.evconduit_last_charge_energy
    name: Last Charge
  - entity: sensor.evconduit_last_charge_cost
    name: Last Cost
  - entity: sensor.evconduit_last_charge_location
    name: Last Location
  - entity: sensor.evconduit_last_charge_duration
    name: Last Duration`}
            language="yaml"
          />

          <h3 className="text-xl font-semibold mt-6">Example: Last Charge Details Template Sensor</h3>
          <p className="mt-2">
            Create a template sensor that shows a human-readable summary of your last charge:
          </p>
          <CodeBlock
            code={`template:
  - sensor:
      - name: "Last EV Charge Summary"
        unique_id: last_ev_charge_summary
        icon: mdi:ev-station
        state: >
          {% set e = states('sensor.evconduit_last_charge_energy') %}
          {% set loc = states('sensor.evconduit_last_charge_location') %}
          {% set dur = states('sensor.evconduit_last_charge_duration') %}
          {% if e and e != 'unknown' %}
            {{ e }} kWh at {{ loc }} ({{ dur | round(0) }} min)
          {% else %}
            No recent charge
          {% endif %}
        attributes:
          energy_kwh: "{{ states('sensor.evconduit_last_charge_energy') }}"
          cost: "{{ states('sensor.evconduit_last_charge_cost') }}"
          currency: "{{ state_attr('sensor.evconduit_last_charge_cost', 'currency') }}"
          location: "{{ states('sensor.evconduit_last_charge_location') }}"
          date: "{{ states('sensor.evconduit_last_charge_date') }}"
          duration_min: "{{ states('sensor.evconduit_last_charge_duration') }}"`}
            language="yaml"
          />
        </div>

        {/* Development Philosophy Section */}
        <div className="mt-16 border-t pt-6">
          <h2 className="text-2xl font-semibold">Development Philosophy</h2>

          <h3 className="text-xl font-semibold mt-6">Continuous Deployment</h3>
          <p className="mt-2">
            EVConduit follows a <strong>Continuous Deployment</strong> approach. Bug fixes,
            improvements, and new features are deployed to production as soon as they are ready
            and tested — there are no scheduled release windows or manual approval gates.
          </p>
          <p className="mt-2">
            This means when an issue is reported and fixed, the fix is live within minutes,
            not days. You can always check the{' '}
            <a href="/docs/updates" className="text-blue-600 underline">Release Notes</a>{' '}
            and{' '}
            <a href="/status" className="text-blue-600 underline">System Status</a>{' '}
            pages to see the latest changes and current service health.
          </p>
        </div>
      </section>
    </main>
  );
}
