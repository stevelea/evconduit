// src/app/(app)/docs/enode-setup/page.tsx
'use client';

import React from 'react';
import { ExternalLink, Heart, Key, Send } from 'lucide-react';

export default function EnodeSetupGuidePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-indigo-700 mb-2">
        Enode Account Share (PIF)
      </h1>
      <p className="text-gray-600 mb-8">
        Share your Enode account capacity with the EVConduit community.
      </p>

      {/* PIF Intro */}
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-8 rounded">
        <div className="flex items-start gap-2">
          <Heart className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-indigo-800">Pay It Forward</p>
            <p className="text-sm text-indigo-700 mt-1">
              EVConduit connects to electric vehicles through Enode, a third-party API.
              Free Enode accounts support up to <strong>5 vehicles</strong>, which means
              capacity is limited. If you already have an Enode account for your own vehicle,
              you can help the community grow by creating an additional <strong>Production
              client</strong> in your Enode organisation and sharing it with EVConduit. This
              lets EVConduit use your spare capacity to connect up to <strong>4 more
              vehicles</strong> for other users. It costs you nothing and helps fellow EV
              owners get connected.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-lg p-4 mb-10 text-sm text-gray-700">
        <p className="font-semibold text-gray-800 mb-2">How it works</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Your Enode account already uses 1 vehicle slot for your own car</li>
          <li>You create a new Production client in your Enode organisation</li>
          <li>You share the client credentials with EVConduit support</li>
          <li>EVConduit adds it as a shared account, reserving 4 slots for other users</li>
          <li>Your own vehicle and account remain completely unaffected</li>
        </ul>
      </div>

      {/* Step 1 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">1</span>
          <h2 className="text-xl font-semibold text-gray-800">Create a New Production Client</h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>
            Log in to your{' '}
            <a
              href="https://developers.enode.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              Enode Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            and create a new client for EVConduit to use.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to your organisation dashboard</li>
            <li>Click <strong>Create Client</strong> (or <strong>Add Client</strong>)</li>
            <li>Give it a descriptive name (e.g. &quot;EVConduit Shared&quot;)</li>
            <li>Select the <strong>Production</strong> environment</li>
            <li>Click <strong>Create</strong></li>
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> Make sure to select <strong>Production</strong>, not
              Sandbox. Sandbox only works with virtual/mock devices and cannot connect real vehicles.
            </p>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">2</span>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Copy the Credentials
          </h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>After creating the client, you will see your credentials. Copy these values:</p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 font-mono text-sm">
            <div>
              <span className="text-gray-500">Client ID:</span>{' '}
              <span className="text-gray-800">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</span>
            </div>
            <div>
              <span className="text-gray-500">Client Secret:</span>{' '}
              <span className="text-gray-800">xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Important:</strong> The Client Secret is only shown once when created.
              Copy it immediately. If you lose it, you will need to generate a new secret
              from the Enode Dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">3</span>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Send className="w-5 h-5" />
            Forward to Support
          </h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>
            Send your <strong>Client ID</strong> and <strong>Client Secret</strong> to
            EVConduit support. We will handle the rest, including configuring webhook
            subscriptions and adding the account to the platform.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              That&apos;s it! Once the account is added, EVConduit will automatically start
              assigning new users to your shared capacity. Your own vehicle and Enode account
              remain completely unaffected.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Will this affect my own vehicle?</h3>
            <p className="text-sm text-gray-600">
              No. The shared client is a separate set of credentials within your Enode
              organisation. Your own vehicle connection remains completely independent.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Does it cost anything?</h3>
            <p className="text-sm text-gray-600">
              No. Free Enode accounts support up to 5 vehicles. Since your own vehicle uses
              1 slot, sharing a client lets EVConduit use up to 4 of the remaining slots at
              no cost to you.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Can I revoke access later?</h3>
            <p className="text-sm text-gray-600">
              Yes. You can delete the shared client from your Enode Dashboard at any time.
              Let EVConduit support know so affected users can be reassigned.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">What if I lose my Client Secret?</h3>
            <p className="text-sm text-gray-600">
              You can generate a new secret from the Enode Dashboard. Send the updated secret
              to EVConduit support so the account configuration can be updated.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
