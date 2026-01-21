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
    version: '2026.01.21',
    date: 'January 21, 2026',
    highlights: 'User Updates news system for dashboard announcements',
    features: [
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
