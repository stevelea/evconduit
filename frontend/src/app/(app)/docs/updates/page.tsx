// src/app/(app)/docs/updates/page.tsx
'use client';

import React from 'react';
import { Sparkles, Wrench, Zap, Shield } from 'lucide-react';

interface ReleaseNote {
  version: string;
  date: string;
  highlights?: string;
  features?: string[];
  fixes?: string[];
  improvements?: string[];
}

const releases: ReleaseNote[] = [
  {
    version: '2026.03.13',
    date: 'March 13, 2026',
    highlights: 'Manual session creation with receipt parsing, personal insights page, orphaned Enode user cleanup, scheduler reliability',
    features: [
      'Manual charging session creation — add past charging sessions manually from the My Charging page with date, energy, cost, and location fields',
      'AI receipt parsing — upload a photo of a charging receipt and let Claude extract the session details automatically',
      'Personal insights page — your personal charging stats (cost summaries, session history) are now on a dedicated page, separate from community insights',
      'Orphaned Enode users admin page — admin tool to identify and clean up Enode user accounts that are no longer linked to an EVConduit account',
    ],
    fixes: [
      'Fixed vehicle relinking blocked when at capacity — returning users can now relink their vehicle even when the account limit is full',
      'Fixed Home Assistant webhook push failing silently — retry logic now tries multiple vehicle ID formats (configured, internal, Enode) before giving up',
      'Fixed Stripe webhook validation errors when STRIPE_WEBHOOK_SECRET is not configured',
    ],
    improvements: [
      'Redis-based scheduler leader election — only one backend worker runs background schedulers in multi-worker deployments, preventing duplicate polling',
      'Smartcar docs page — new documentation page explaining Smartcar integration setup and supported features',
      'HA webhook push stats now distinguish between "rejected" (ID mismatch) and "error" (connection/timeout) failures',
    ],
  },
  {
    version: '2026.03.11',
    date: 'March 11, 2026',
    highlights: 'MQTT output for non-HA users, Smartcar live mode, brand cross-reference, EVLink→EVConduit rebrand',
    features: [
      'MQTT output — enable on your Profile page to receive vehicle data via any MQTT client (Node-RED, MQTT Explorer, OpenHAB, custom apps). Auto-provisioned credentials, retained JSON messages, isolated per-user topics.',
      'Smartcar integration live — Smartcar Connect now uses live mode (previously simulated). All users can link vehicles via Smartcar from the Dashboard.',
      'Brand cross-reference table — Capabilities page now shows which brands are supported by Enode, Smartcar, and ABRP side-by-side with overlap indicators.',
      'Smartcar card on landing page — new connection method card alongside Enode and ABRP for new visitors.',
    ],
    improvements: [
      'Rebranded EVLink → EVConduit across all pages, footers, locale files, and feature descriptions',
      'Updated hero section and feature cards to be brand-neutral (removed XPENG-specific references)',
      'Integration Guide now includes Smartcar as Option B and MQTT as alternative to Home Assistant',
    ],
  },
  {
    version: '2026.03.10',
    date: 'March 10, 2026',
    highlights: 'Fix charging controls and HA API documentation',
    fixes: [
      'Fixed Start/Stop charging buttons in the web UI returning "Invalid API key" — buttons now use JWT authentication instead of API key auth',
      'Fixed HA API documentation showing incorrect base URL and authentication method — corrected to use backend.evconduit.com and Authorization: Bearer header',
      'Fixed HA API documentation charging endpoint URL causing 404 errors — removed incorrect /v1/ path prefix',
    ],
  },
  {
    version: '2026.03.09',
    date: 'March 9, 2026',
    highlights: 'Optional supporter subscription to help cover hosting and development costs',
    features: [
      'Optional $5 AUD/month supporter subscription — available on the dashboard and billing page to help cover hosting, API, and development costs. Cancel anytime.',
      'Support card on dashboard — non-intrusive card at the bottom of the dashboard with one-click Stripe checkout',
      'Updated landing page — support section replaces Buy Me a Coffee with Stripe-powered subscription option',
    ],
  },
  {
    version: '2026.03.06',
    date: 'March 6, 2026',
    highlights: 'Charging history sync to Home Assistant with incremental local storage',
    features: [
      'Charging history in Home Assistant — opt-in feature (Settings → Devices & Services → EVConduit → Configure) that syncs charging session history to HA local storage with incremental sync',
      'New HA sensors: Last Charge Energy, Cost, Location, Date, Duration — plus 30-day aggregate sensors for total energy, cost, and session count',
      'New HA service: evconduit.sync_charging_history — triggers an immediate incremental sync of charging sessions',
      'New backend endpoint GET /ha/charging/sessions — returns charging sessions with incremental sync support via `since` parameter',
    ],
    improvements: [
      'HA integration bumped to v1.9.0 with charging history support',
      'Charging history sync piggybacks on existing vehicle poll interval with 15-minute throttle to minimize API calls',
    ],
  },
  {
    version: '2026.03.05',
    date: 'March 5, 2026',
    highlights: 'AI debug assistant, auto OCM check-in, architecture diagram, OpenChargeMap check-in, charging station info, automatic cost calculation from electricity rates',
    features: [
      'AI Debug Assistant — a Claude-powered chat widget (bottom-right sparkle button) that can see your account, vehicles, and Home Assistant integration to help troubleshoot issues in real-time with streaming responses',
      'Charging cost summary — My Charging page now shows total charging costs for last 7 days, 30 days, 12 months, and all time, grouped by currency',
      'Auto OCM check-in — enable a profile toggle to automatically report public charging sessions to OpenChargeMap when finalized, no manual action needed',
      'Architecture & Data Flow page — visual diagram showing how data flows between your car, Enode, ABRP, EVConduit, and Home Assistant (under Guides)',
      'OpenChargeMap check-in — report successful or failed charging sessions directly to OpenChargeMap from the session detail page, with optional star rating',
      'Charging station info — public charging sessions now automatically detect and persist the station name, operator, address, and usage cost from OpenChargeMap at session finalization',
      'Station info in session list — charging session cards now show the station name and operator inline for quick identification',
      'Station usage cost — session detail page shows the estimated cost from OpenChargeMap (informational only, does not override manual cost entries)',
      'Electricity rate push from Home Assistant — the EVConduit HA integration (v1.8.0+) can now automatically push your configured electricity rate sensor to EVConduit on change and every 5 minutes, with currency auto-detected from your HA settings',
      'Home location settings — set your home coordinates and radius on the Profile page for automatic at-home session detection',
      'Auto-calculated charging costs — when a charging session completes at home, costs are automatically calculated using the electricity rate history with a granular time-based breakdown',
      'Cost breakdown table — session detail page now shows how much energy was consumed at each rate during a charging session',
      'Manual electricity rate entry — set your rate directly from the web UI on the Profile page',
    ],
    fixes: [
      'Fixed OpenChargeMap check-in failing with "failed to fetch" — OCM auth endpoint requires API key as query parameter, and token is nested under Data.access_token in the response',
      'Fixed admin dashboard vehicle count not including ABRP-sourced vehicles — total was stuck at Enode-only count',
      'Fixed AI assistant not seeing Home Assistant webhook status — was using a limited user model instead of full database row',
    ],
    improvements: [
      'Backfilled OpenChargeMap station IDs for 171 existing public charging sessions — check-in and rating UI now available on historical sessions',
      'Session detail page now displays total cost and rate in the summary card with auto-calculated indicator',
      'Manually editing cost fields on a session clears the auto-applied state so you can override automatic calculations',
      'Community Insights page now shows battery State of Health (SOH) stats from ABRP — Low, Average, and High across the fleet',
      'Older sessions without persisted station data fall back to live OpenChargeMap lookup on the detail page',
      'Database security hardening — enabled RLS on electricity_rate_log and xpeng_tracker_submissions, fixed privilege escalation in webhook_subscriptions RLS policy, converted views to SECURITY INVOKER',
    ],
  },
  {
    version: '2026.03.04',
    date: 'March 4, 2026',
    highlights: 'Multi-worker backend to eliminate 502 errors, enhanced status page, odometer pre-fill, and currency fixes',
    features: [
      'Status page now shows all backend services — Redis, Database, and Enode API health with response times',
      'Session odometer field now pre-fills from Enode vehicle data when available, so you don\'t have to enter it manually',
    ],
    fixes: [
      'Fixed root cause of 502 errors — single uvicorn worker was saturated during polling cycles (60+ Enode API calls + 50+ HA webhook pushes), blocking incoming requests. Now runs 4 gunicorn workers with Redis-based leader election so only one worker runs background schedulers',
      'Fixed Docker healthchecks for frontend and XPENG tracker — Next.js standalone binds to container IP instead of 0.0.0.0 because Docker overrides the HOSTNAME env var with the container ID',
      'Fixed default currency showing SEK for all users — now correctly defaults based on vehicle country (e.g. AUD for Australia)',
    ],
    improvements: [
      'Backend now runs gunicorn with 4 uvicorn workers — 3 dedicated to API requests, 1 leader worker also handles polling/webhooks',
      'Redis-based scheduler leader election ensures background tasks run exactly once across all workers, with auto-renewal and failover',
    ],
  },
  {
    version: '2026.03.03',
    date: 'March 3, 2026',
    highlights: 'Fixed 502 errors, concurrent polling, per-source timestamps, and ABRP data freshness',
    features: [
      'Per-source last seen — merged Enode+ABRP vehicles now show separate timestamps for each data source (e.g. "E 5m ago · ABRP 2m ago")',
      'XPENG Issue & Suggestion Tracker — standalone Lark Database frontend for browsing and submitting XPENG issues',
    ],
    fixes: [
      'Fixed intermittent 502 errors — background vehicle polling was blocking the async event loop for 3-5 minutes, starving incoming HTTP requests',
      'Fixed ABRP vehicle data appearing stale on dashboard — Enode cache freshness check no longer blocks ABRP data from updating',
    ],
    improvements: [
      'Vehicle and ABRP polling now runs concurrently (5 and 3 parallel users respectively) instead of sequentially, reducing poll cycle time and keeping the server responsive',
      'Nginx now returns JSON error responses instead of Cloudflare HTML pages when upstream errors occur',
      'Vehicle API now always returns the latest ABRP data from the database instead of serving potentially stale cached responses',
    ],
  },
  {
    version: '2026.03.02',
    date: 'March 2, 2026',
    highlights: 'Merged same-car dashboard view, admin vendor unlink tracking, and ABRP visibility',
    features: [
      'Same-car merge — vehicles linked via both Enode and ABRP now appear as a single row with E + ABRP badges instead of two separate entries',
      'Merged vehicle details modal shows data from both sources with combined source badges and ABRP extra telemetry',
      'Vendor unlink history — admin dashboard now tracks who unlinked a vendor, when, and how many vehicles were removed',
      'Admin users list now shows E (Enode) and A (ABRP) connection badges instead of simple checkmarks',
      'ABRP-only users now show "ABRP" in the Account column instead of "None"',
      'Admin Pushover notifications now fire when users link vehicles via ABRP',
    ],
  },
  {
    version: '2026.03.01',
    date: 'March 1, 2026',
    highlights: 'Multi-vehicle Home Assistant support and webhook push reliability improvements',
    features: [
      'Multi-vehicle HA support — add multiple EVConduit integration entries (one per vehicle) with isolated sensors, devices, and webhooks',
      'Services (set_charging, update_odometer, send_abrp_telemetry) now accept optional vehicle_id parameter to target specific vehicles',
      'HA devices now show actual vehicle name and model instead of generic "EVConduit"',
      'Config flow now uses vehicle display name as entry title for easy identification',
      'Duplicate vehicle prevention — config flow blocks adding the same vehicle twice',
    ],
    fixes: [
      'Fixed services being overwritten when multiple integration entries are loaded — only last vehicle was controllable',
      'Fixed unloading one vehicle entry removing services for all vehicles',
      'Fixed reconfigure step always targeting the first entry instead of the selected one',
      'Fixed webhook handler crashing when coordinator not found (now returns 404 gracefully)',
    ],
    improvements: [
      'Multi-vehicle webhook routing — backend ha_webhooks JSON array routes pushes to the correct HA entry per vehicle',
      'Webhook push retry logic with alternative vehicle ID for Enode/internal ID mismatch recovery',
      'ABRP vehicles now contribute to Insights — charging samples and sessions are recorded for ABRP-only vehicles, so Insights is no longer empty for users without Enode',
    ],
  },
  {
    version: '2026.02.27',
    date: 'February 27, 2026',
    highlights: 'Official ABRP API integration, token-based auth, 60s polling, cross-source data merge, and landing page update',
    features: [
      'ABRP API integration — use A Better Route Planner as an alternative vehicle data source, bypassing Enode connection limits',
      'Official ABRP API access — simple token-based setup replaces manual credential extraction',
      'ABRP-sourced vehicles appear in the dashboard with an ABRP badge alongside Enode vehicles',
      'Cross-source data merge — when the same car is linked via both Enode and ABRP, data is automatically combined for the most complete view',
      'Vehicle discovery — browse all vehicles in your ABRP session and select which to pull',
      'Comprehensive ABRP telemetry — captures battery capacity, estimated range, HVAC power/setpoint, cabin temp, tire pressures, heading, state of energy, and parked status',
      'Country field on user profile for regional analytics',
      'ABRP API vehicle count and user count on admin dashboard',
      'Auto-disable ABRP pull after 3 consecutive failures with email notification',
      'ABRP API setup guide with token-based and legacy credential instructions',
      'Updated landing page showing Enode registrations full with ABRP as open alternative',
      'ABRP-only users get vehicle data pushed to Home Assistant automatically — no Enode connection required',
      'Home Assistant integration supports 15 new ABRP sensors: battery health, voltage, current, temperatures, tire pressures, speed, elevation, and more',
    ],
    fixes: [
      'Fixed Home Assistant rejecting updates when both Enode and ABRP vehicles are linked — only Enode vehicles now push to HA',
    ],
    improvements: [
      'ABRP polling interval reduced from 5 minutes to 60 seconds (approved by ABRP team)',
      'ABRP car model code parsed into proper brand, model, year, battery size, and drivetrain',
      'Vehicle detail views (user and admin) now show all available ABRP telemetry fields',
      'Legacy ABRP credentials moved to collapsible Advanced section — token-based setup is now primary',
    ],
  },
  {
    version: '2026.02.25',
    date: 'February 25, 2026',
    highlights: 'Admin-managed useful links banner on the landing page',
    features: [
      'Admin-managed Useful Links - landing page community tools banner is now dynamically driven from the admin panel',
      'Useful Links admin page - add, edit, reorder, toggle visibility, and delete banner links without code changes',
    ],
  },
  {
    version: '2026.02.19',
    date: 'February 19, 2026',
    highlights: 'Multi-Enode account support, Pay It Forward guide, simplified pricing, and capacity management',
    features: [
      'Multi-Enode account support - manage multiple Enode API accounts with separate credentials and vehicle limits',
      'Enode Accounts admin page - view, create, edit, and delete Enode accounts with capacity indicators',
      'Auto-assignment of new users to the Enode account with the most remaining vehicle capacity',
      'Admin user reassignment - move users between Enode accounts via the admin panel',
      'Per-account credential testing from the admin UI',
      'Multi-secret webhook verification - incoming webhooks are verified against all active account secrets',
      'Enode Account Share (PIF) guide - community members can share spare Enode capacity with EVConduit',
      'Full capacity splash overlay - landing page shows "at full capacity" when vehicle limit is reached',
      'Registration automatically blocked when vehicle capacity is full',
    ],
    improvements: [
      'Simplified landing page - single free tier card replaces multi-plan pricing grid',
      'Enode Accounts page title shows total registered vehicles across all accounts',
      'Vehicle and user admin tables now show which Enode account each entry belongs to',
      'Webhook health monitoring now operates across all Enode accounts',
      'All Enode API calls now route through the correct account credentials',
    ],
    fixes: [
      'Fixed per-account webhook subscription check - secondary accounts now get auto-created subscriptions',
      'Fixed stale HA mismatch warning persisting after re-registering webhook',
      'Fixed admin users page showing no users when Enode user cache hits',
      'Fixed admin vehicles page only showing one vehicle - now uses database cache instead of live Enode API calls',
      'Fixed vehicle polling only updating users with HA webhooks - now polls all users with linked vehicles so legacy HA endpoint users also get fresh data',
    ],
  },
  {
    version: '2026.02.05',
    date: 'February 5, 2026',
    highlights: 'False charging notification suppression for vehicles with bad vendor data',
    fixes: [
      'Pushover notifications no longer fire for false charge-started/charge-complete events caused by stale or flipflopping data from vehicle vendors (notably XPENG)',
    ],
  },
  {
    version: '2026.01.22',
    date: 'January 22, 2026',
    highlights: 'ABRP (A Better Route Planner) integration for real-time telemetry',
    features: [
      'ABRP integration - automatically send vehicle telemetry (SOC, location, charging status) to A Better Route Planner',
      'ABRP settings card on Profile page - configure your ABRP token and enable/disable updates',
      'Test button to verify ABRP connectivity',
      'ABRP push statistics - track successful and failed telemetry pushes',
    ],
  },
  {
    version: '2026.01.21',
    date: 'January 21, 2026',
    highlights: 'Charging sessions history with detailed analytics, cost tracking, and CSV export',
    features: [
      'Charging Sessions list on Insights page (Pro users) - view your complete charging history',
      'Session detail page with battery level and charge rate charts',
      'Cost tracking per session - enter cost per kWh or total cost (auto-calculates the other)',
      'Odometer entry per charging session for tracking',
      'CSV export of all charging sessions',
      'User Updates on dashboard - see important news and announcements from EVConduit admins',
      'Admin User Updates management - create, edit, and manage multiple update items with priority ordering',
    ],
  },
  {
    version: '2026.01.20',
    date: 'January 20, 2026',
    highlights: 'Vehicle polling fallback, on-demand refresh button, webhook auto-recovery, and improved resilience',
    features: [
      'On-demand "Refresh from Enode" button on dashboard - manually fetch latest vehicle data without waiting for webhooks',
      'Background vehicle polling service - polls Enode every 5 minutes as fallback when webhooks are delayed',
      'Webhook auto-recovery - automatically reactivates inactive Enode webhooks via test endpoint',
      'HA webhook push statistics and test connection on Profile page - see success/fail counts, reachability status, and test your webhook connection',
      'Admin user logs - View webhook and poll logs for any user in admin dashboard',
      'Vehicles by Country chart on Insights page - see distribution of EVConduit vehicles across countries with flags',
      'Unknown location category for vehicles without location data (shows globe icon)',
      'VIN-based vehicle matching - Relinking your car now updates the existing record instead of creating duplicates',
      'Vehicle history is preserved when relinking (charging sessions, samples)',
      'Release Notes page added under Guides section',
    ],
    fixes: [
      'Fixed webhook becoming inactive causing no updates for hours - now auto-recovers',
      'Fixed webhook batch processing saving stale data - now correctly processes the most recent event per vehicle when Enode sends out-of-order batches',
      'Fixed HA webhook vehicle ID mismatch - webhooks now use the correct internal ID that matches HA configuration',
      'Fixed missing vehicle displayName in HA - now falls back to brand + model (e.g., "XPENG G6")',
      'Fixed unlink button not working from user dashboard',
      'Fixed orphaned vehicle records when unlinking',
      'Fixed vehicle ID display mismatch between user dashboard and admin view',
      'Local database now properly cleaned up when unlinking a vendor',
    ],
    improvements: [
      'HA push and Pushover notifications now fire-and-forget to respond to Enode within 5-second timeout',
      'Added indexed VIN column for faster vehicle lookups',
      'Improved vehicle matching logic for relink scenarios',
    ],
  },
  {
    version: '2026.01.19',
    date: 'January 19, 2026',
    highlights: 'Charging insights fixes and session detection improvements',
    features: [
      'New battery-based charging session detection (more reliable than is_charging flag)',
      'Session regeneration utility for recalculating historical sessions',
    ],
    fixes: [
      'Fixed charging statistics showing incorrect values',
      'Fixed sessions spanning impossibly long durations (24-36 hours)',
      'Fixed negative energy sessions appearing in stats',
      'Fixed duplicate charging sessions',
    ],
    improvements: [
      'Added validation rules for charging sessions (max 8 hour gap, min 5% increase)',
      'Improved charge rate calculation with sanity checks',
      'Better handling of data gaps and bad Enode data',
    ],
  },
  {
    version: '2026.01.18',
    date: 'January 18, 2026',
    highlights: 'Country flags in admin, editable profile names, and performance optimizations',
    features: [
      'Country flags displayed next to vehicles in admin dashboard',
      'Editable display name for vehicles in user profile',
    ],
    improvements: [
      'Cached country code lookups to reduce reverse geocoding calls',
      'Performance indexes for common database queries',
    ],
  },
  {
    version: '2026.01.17',
    date: 'January 17, 2026',
    highlights: 'Home Assistant webhook status and debugging improvements',
    features: [
      'HA webhook status visible in admin user details',
      'Debug logging for Enode webhooks',
    ],
    fixes: [
      'Documented XPENG "Charging Complete" misreported as unplugged issue',
    ],
  },
];

export default function UpdatesPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">
        Release Notes
      </h1>

      <p className="text-gray-600 mb-8">
        Recent updates and improvements to EVConduit.
      </p>

      <div className="space-y-12">
        {releases.map((release) => (
          <section key={release.version} className="border-l-4 border-indigo-500 pl-6">
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-2xl font-semibold text-gray-800">
                {release.version}
              </h2>
              <span className="text-sm text-gray-500">{release.date}</span>
            </div>

            {release.highlights && (
              <p className="text-indigo-600 font-medium mb-4">
                {release.highlights}
              </p>
            )}

            {release.features && release.features.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  New Features
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600">
                  {release.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {release.fixes && release.fixes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <Wrench className="w-5 h-5 text-orange-600" />
                  Bug Fixes
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600">
                  {release.fixes.map((fix, i) => (
                    <li key={i}>{fix}</li>
                  ))}
                </ul>
              </div>
            )}

            {release.improvements && release.improvements.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Improvements
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600">
                  {release.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Reporting Issues
        </h2>
        <p className="text-gray-600">
          Found a bug or have a feature request? Please report issues on our{' '}
          <a
            href="https://github.com/anthropics/claude-code/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            GitHub repository
          </a>.
        </p>
      </section>
    </main>
  );
}
