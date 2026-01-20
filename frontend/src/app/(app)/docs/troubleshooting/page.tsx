// src/app/(app)/docs/troubleshooting/page.tsx
'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Unplug, Zap } from 'lucide-react';

export default function TroubleshootingPage() {
  return (
    <main className='max-w-3xl mx-auto px-6 py-12'>
      <h1 className='text-3xl font-bold text-indigo-700 mb-6'>
        FAQ &amp; Troubleshooting
      </h1>

      <p className='text-gray-600 mb-8'>
        Common issues and solutions for EVConduit and Home Assistant integration.
      </p>

      {/* Relinking a Vehicle */}
      <section className='mb-10'>
        <h2 className='text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2'>
          <RefreshCw className='w-6 h-6 text-indigo-600' />
          Relinking a Vehicle
        </h2>

        <div className='space-y-4'>
          <p>
            If you need to relink your vehicle (e.g., to fix stale data or connection issues),
            follow these steps:
          </p>

          <ol className='list-decimal list-inside space-y-2 ml-4'>
            <li>In EVConduit, go to your Dashboard and unlink the vehicle</li>
            <li>In Home Assistant, <strong>delete the EVConduit integration</strong></li>
            <li>Relink your vehicle in EVConduit</li>
            <li>Re-add the EVConduit integration in Home Assistant</li>
          </ol>

          <Alert>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              You must delete and re-add the Home Assistant integration to pick up the new vehicle ID.
              Simply relinking in EVConduit is not enough.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* XPENG Issues */}
      <section className='mb-10'>
        <h2 className='text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2'>
          <Zap className='w-6 h-6 text-indigo-600' />
          XPENG Known Issues
        </h2>

        <div className='space-y-4'>
          <h3 className='text-lg font-medium text-gray-700'>Charging state not updating</h3>
          <p>
            XPENG vehicles may sometimes show incorrect charging status. Common issues include:
          </p>
          <ul className='list-disc list-inside space-y-1 ml-4'>
            <li>Vehicle shows &quot;Plugged In&quot; but not charging when it actually is charging</li>
            <li>Vehicle shows &quot;Unplugged&quot; when it&apos;s plugged in but finished charging</li>
            <li>Battery level or charge rate not updating in real-time</li>
          </ul>

          <h3 className='text-lg font-medium text-gray-700 mt-4'>Solutions</h3>
          <ol className='list-decimal list-inside space-y-2 ml-4'>
            <li><strong>Wait a few minutes</strong> - Sometimes there&apos;s a delay in data sync</li>
            <li><strong>Stop and restart charging</strong> from the XPENG app</li>
            <li><strong>Unlink and relink</strong> the vehicle (see above)</li>
            <li><strong>Check the XPENG app</strong> - If the app shows correct data but EVConduit doesn&apos;t, the issue is with the Enode/XPENG integration</li>
          </ol>

          <Alert variant='default' className='bg-amber-50 border-amber-200'>
            <AlertTriangle className='h-4 w-4 text-amber-600' />
            <AlertTitle className='text-amber-800'>Vendor API Limitation</AlertTitle>
            <AlertDescription className='text-amber-700'>
              These issues are caused by XPENG&apos;s API not reporting accurate data to Enode.
              EVConduit displays exactly what Enode provides. We recommend reporting persistent
              issues to Enode support.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Webhooks Not Working */}
      <section className='mb-10'>
        <h2 className='text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2'>
          <Unplug className='w-6 h-6 text-indigo-600' />
          Home Assistant Not Receiving Updates
        </h2>

        <div className='space-y-4'>
          <p>
            If your Home Assistant entities show as &quot;Unavailable&quot; or aren&apos;t updating:
          </p>

          <h3 className='text-lg font-medium text-gray-700'>Check your webhook configuration</h3>
          <ol className='list-decimal list-inside space-y-2 ml-4'>
            <li>Verify your Home Assistant external URL is correctly configured in EVConduit settings</li>
            <li>Ensure your webhook ID matches what Home Assistant expects</li>
            <li>Check that your Home Assistant instance is accessible from the internet</li>
          </ol>

          <h3 className='text-lg font-medium text-gray-700 mt-4'>Check the integration</h3>
          <ol className='list-decimal list-inside space-y-2 ml-4'>
            <li>In Home Assistant, go to Settings → Devices &amp; Services</li>
            <li>Find the EVConduit integration and check its status</li>
            <li>If entities are unavailable, try removing and re-adding the integration</li>
          </ol>

          <h3 className='text-lg font-medium text-gray-700 mt-4'>Verify vehicle data</h3>
          <p>
            Check if your vehicle is receiving updates in the EVConduit dashboard.
            If the dashboard shows current data but Home Assistant doesn&apos;t, the issue
            is likely with the webhook configuration.
          </p>
        </div>
      </section>

      {/* General Tips */}
      <section className='mb-10'>
        <h2 className='text-2xl font-semibold text-gray-800 mb-4'>
          General Tips
        </h2>

        <ul className='list-disc list-inside space-y-2 ml-4'>
          <li>Vehicle data typically updates every few minutes, not in real-time</li>
          <li>Some vehicle features require the car to be &quot;awake&quot; to report data</li>
          <li>If you change your vehicle&apos;s configuration in the manufacturer app, you may need to relink</li>
          <li>Clear your browser cache if the EVConduit dashboard shows stale data</li>
        </ul>
      </section>

      {/* Contact Support */}
      <section className='mb-10'>
        <h2 className='text-2xl font-semibold text-gray-800 mb-4'>
          Still Having Issues?
        </h2>

        <p>
          If you&apos;ve tried the above solutions and still have problems, please contact support
          with the following information:
        </p>
        <ul className='list-disc list-inside space-y-1 ml-4 mt-2'>
          <li>Your vehicle make and model</li>
          <li>Description of the issue</li>
          <li>What you see in the EVConduit dashboard vs. what you expect</li>
          <li>Screenshots if possible</li>
        </ul>
      </section>
    </main>
  );
}
