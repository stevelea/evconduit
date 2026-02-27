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
    version: '2026.02.27',
    date: 'February 27, 2026',
    highlights: 'ABRP Pull integration with comprehensive telemetry, country profile field, and HA push fix',
    features: [
      'ABRP Pull integration — use A Better Route Planner as an alternative vehicle data source, bypassing Enode connection limits',
      'ABRP-sourced vehicles appear in the dashboard with an ABRP badge alongside Enode vehicles',
      'Test Pull button to verify ABRP credentials and preview raw telemetry data',
      'Background ABRP polling — enabled vehicles are automatically refreshed every 5 minutes',
      'Vehicle discovery — browse all vehicles in your ABRP session and select which to pull',
      'Comprehensive ABRP telemetry — captures battery capacity, estimated range, HVAC power/setpoint, cabin temp, tire pressures, heading, state of energy, and parked status',
      'Country field on user profile for regional analytics',
      'ABRP Pull vehicle count and user count on admin dashboard',
      'Auto-disable ABRP pull after 3 consecutive failures with email notification',
      'ABRP Pull setup guide with step-by-step credential extraction instructions',
    ],
    fixes: [
      'Fixed Home Assistant rejecting updates when both Enode and ABRP vehicles are linked — only Enode vehicles now push to HA',
    ],
    improvements: [
      'ABRP car model code parsed into proper brand, model, year, battery size, and drivetrain',
      'Vehicle detail views (user and admin) now show all available ABRP telemetry fields',
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
