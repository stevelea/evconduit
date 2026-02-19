# Connect Your Vehicle to EVConduit and Home Assistant

## 🚀 Step-by-step Instructions

### 1. 🔐 Create an Account
- Visit [https://evconduit.com/register](https://evconduit.com/register)
- Login via **Magic Link** (email) or **GitHub**
- You will be redirected to your dashboard after logging in

### 2. 🔑 Create API Key
- Go to **Profile**: [https://evconduit.com/profile](https://evconduit.com/profile)
- Click **"Create API Key"**
- Copy your API key – you’ll use it in Home Assistant's `secrets.yaml`

### 3. 🚗 Link Your Vehicle
- Go to **Dashboard**
- Click **"Link Vehicle"**
- Choose manufacturer (**XPENG** supported currently; more to come)
- You’ll be redirected to the manufacturer login
- Once linked, your vehicle will appear in the dashboard
- Click **"Copy ID"** to copy your vehicle ID for use in Home Assistant

### 4. 🏠 Configure Home Assistant

#### `secrets.yaml`:

```yaml
evlink_api_key: "Bearer <API_CODE>"
evlink_status_url: "https://api.evconduit.cloud/api/ha/status/<VEHICLE_ID>"
```

Replace `<API_CODE>` and `<VEHICLE_ID>` with your actual values.

#### `configuration.yaml`:

```yaml
sensor:
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
        unique_id: "evlink_battery_level"
        unit_of_measurement: "%"
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
        device_class: plug
```

> ⚠️ **Important:** Do **not** change `scan_interval`. It must stay at `300` (5 minutes). Polling more frequently may trigger rate limiting.

### 5. ✅ Verify in Home Assistant
- Go to **Developer Tools → States**
- Look for: `sensor.evlink_battery_level`, `binary_sensor.ev_is_charging`, etc.
- You should see real-time values updating

---

## 🗺️ ABRP Integration (A Better Route Planner)

EVConduit can automatically send your vehicle's live telemetry data to [A Better Route Planner (ABRP)](https://abetterrouteplanner.com/) for accurate route planning with real-time battery information.

### Prerequisites
- EVConduit configured in Home Assistant (steps above)
- ABRP app installed on your phone

### Step 1: Get Your ABRP Generic Token

1. Open the **ABRP app** on your phone or visit [abetterrouteplanner.com](https://abetterrouteplanner.com) on your computer (easier to copy the token)
2. Go to your vehicle settings and find **Connections** (or Live Data settings)
3. Under **In-car live data**, find the **Generic** option and tap **Link**

![ABRP Connections Screen](/docs/images/ABRPToken.png)

4. ABRP will generate a **Generic Token** for your vehicle
5. Tap **Copy Token** to copy it to your clipboard

![ABRP Generic Token](/docs/images/ABRPGeneric.png)

### Step 2: Configure EVConduit in Home Assistant

1. In Home Assistant, go to **Settings → Devices & Services**
2. Find **EVConduit** and click on it
3. Click the **three-dot menu** (⋮) and select **Reconfigure**

![EVConduit Reconfigure Menu](/docs/images/Reconfigure.png)

4. In the reconfigure dialog, paste your **ABRP Token** in the "ABRP Token (optional)" field
5. Click **Submit**

![EVConduit Reconfigure Dialog](/docs/images/reconfigure2.png)

### Step 3: Verify ABRP Connection

- Open the ABRP app and start planning a route
- You should see live battery data from your vehicle
- The data updates automatically when your vehicle state changes

> 💡 **Tip:** You can also configure ABRP directly in EVConduit's web interface at [evconduit.com/profile](https://evconduit.com/profile) under the ABRP Integration section.