// src/app/(app)/docs/enode-setup/page.tsx
'use client';

import React from 'react';
import { AlertCircle, ExternalLink, Key, Server, Shield, Webhook } from 'lucide-react';

export default function EnodeSetupGuidePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-indigo-700 mb-2">
        Enode Account Setup Guide
      </h1>
      <p className="text-gray-600 mb-8">
        How to create an Enode account and configure it for use with EVConduit.
      </p>

      {/* Overview */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-800">What is Enode?</p>
            <p className="text-sm text-blue-700 mt-1">
              Enode is the API that connects EVConduit to your electric vehicle.
              It provides a unified interface to 45+ EV brands, enabling real-time
              vehicle data, charging status, and remote commands. Each Enode account
              supports a limited number of vehicles, so EVConduit can use multiple
              accounts to scale.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">1</span>
          <h2 className="text-xl font-semibold text-gray-800">Create an Enode Account</h2>
        </div>
        <ol className="list-decimal list-inside space-y-3 text-gray-700 ml-11">
          <li>
            Go to{' '}
            <a
              href="https://developers.enode.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              developers.enode.com/register
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Sign up with your email and create your organisation</li>
          <li>Verify your email address</li>
          <li>
            Log in to the{' '}
            <a
              href="https://developers.enode.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              Enode Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
        </ol>
      </section>

      {/* Step 2 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">2</span>
          <h2 className="text-xl font-semibold text-gray-800">Create a Client</h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>
            In the Enode Dashboard, create a new <strong>Production</strong> client.
            This generates the credentials EVConduit needs.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to your organisation dashboard</li>
            <li>Click <strong>Create Client</strong> (or <strong>Add Client</strong>)</li>
            <li>Give it a descriptive name (e.g. &quot;EVConduit Production&quot;)</li>
            <li>Select the <strong>Production</strong> environment</li>
            <li>Click <strong>Create</strong></li>
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-amber-800">
              <strong>Sandbox vs Production:</strong> Use <strong>Production</strong> for real vehicles.
              Sandbox is for testing with virtual/mock devices only.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">3</span>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Get Your Credentials
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
              Copy it immediately and store it securely. If you lose it, you will need to
              generate a new secret from the dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Step 4 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">4</span>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Server className="w-5 h-5" />
            Note the API URLs
          </h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>For a <strong>Production</strong> client, use these URLs:</p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 font-mono text-sm">
            <div>
              <span className="text-gray-500">Base URL:</span>{' '}
              <span className="text-gray-800">https://enode-api.production.enode.io</span>
            </div>
            <div>
              <span className="text-gray-500">Auth URL:</span>{' '}
              <span className="text-gray-800">https://oauth.production.enode.io/oauth2/token</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            For Sandbox testing, replace <code className="bg-gray-100 px-1 rounded">production</code> with{' '}
            <code className="bg-gray-100 px-1 rounded">sandbox</code> in both URLs.
          </p>
        </div>
      </section>

      {/* Step 5 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">5</span>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Configure Webhook Settings
          </h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>
            EVConduit receives real-time vehicle updates via webhooks. You need to set up
            a webhook secret that EVConduit will use to verify incoming events.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Generate a strong random secret (e.g. 32+ characters). You can use a
              password generator or run:{' '}
              <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">openssl rand -hex 32</code>
            </li>
            <li>Keep this secret handy - you will enter it in EVConduit</li>
          </ol>
          <p>The following values are needed for EVConduit:</p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 font-mono text-sm">
            <div>
              <span className="text-gray-500">Webhook URL:</span>{' '}
              <span className="text-gray-800">https://backend.evconduit.com/api/webhook/enode</span>
            </div>
            <div>
              <span className="text-gray-500">Webhook Secret:</span>{' '}
              <span className="text-gray-800">(your generated secret)</span>
            </div>
            <div>
              <span className="text-gray-500">Redirect URI:</span>{' '}
              <span className="text-gray-800">https://evconduit.com/link-callback</span>
            </div>
          </div>
        </div>
      </section>

      {/* Step 6 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">6</span>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Add the Account to EVConduit
          </h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>
            As an EVConduit admin, go to the{' '}
            <a href="/admin/enode-accounts" className="text-indigo-600 hover:underline">
              Enode Accounts
            </a>{' '}
            page in the admin panel and click <strong>Add Account</strong>.
          </p>
          <p>Fill in the following fields:</p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Field</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr><td className="px-4 py-2 font-medium">Name</td><td className="px-4 py-2">A descriptive name (e.g. &quot;Production Account 1&quot;)</td></tr>
                <tr><td className="px-4 py-2 font-medium">Client ID</td><td className="px-4 py-2 font-mono text-xs">From Enode Dashboard (step 3)</td></tr>
                <tr><td className="px-4 py-2 font-medium">Client Secret</td><td className="px-4 py-2 font-mono text-xs">From Enode Dashboard (step 3)</td></tr>
                <tr><td className="px-4 py-2 font-medium">Base URL</td><td className="px-4 py-2 font-mono text-xs">https://enode-api.production.enode.io</td></tr>
                <tr><td className="px-4 py-2 font-medium">Auth URL</td><td className="px-4 py-2 font-mono text-xs">https://oauth.production.enode.io/oauth2/token</td></tr>
                <tr><td className="px-4 py-2 font-medium">Webhook URL</td><td className="px-4 py-2 font-mono text-xs">https://backend.evconduit.com/api/webhook/enode</td></tr>
                <tr><td className="px-4 py-2 font-medium">Webhook Secret</td><td className="px-4 py-2 font-mono text-xs">Your generated secret (step 5)</td></tr>
                <tr><td className="px-4 py-2 font-medium">Redirect URI</td><td className="px-4 py-2 font-mono text-xs">https://evconduit.com/link-callback</td></tr>
                <tr><td className="px-4 py-2 font-medium">Max Vehicles</td><td className="px-4 py-2">Vehicle limit for this account (default: 4)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Step 7 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">7</span>
          <h2 className="text-xl font-semibold text-gray-800">Test the Connection</h2>
        </div>
        <div className="ml-11 space-y-3 text-gray-700">
          <p>
            After adding the account, use the <strong>Test Credentials</strong> button on the
            Enode Accounts page to verify the connection. A successful test confirms that
            EVConduit can authenticate with the Enode API using your credentials.
          </p>
          <p>
            You can also use <strong>Get Info</strong> to see live stats from the Enode API,
            including user count, vehicle count, and active webhook subscriptions.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              EVConduit will automatically create webhook subscriptions for new accounts
              and assign new users to the account with the most remaining vehicle capacity.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Why do I need multiple Enode accounts?</h3>
            <p className="text-sm text-gray-600">
              Each Enode account has a vehicle limit. As your user base grows, you can add
              additional accounts to increase total capacity. EVConduit automatically distributes
              new users across accounts.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">What is the vehicle limit per account?</h3>
            <p className="text-sm text-gray-600">
              This depends on your Enode plan. Free/developer accounts typically support a
              small number of vehicles. Contact Enode for production pricing and higher limits.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Can I use Sandbox for testing?</h3>
            <p className="text-sm text-gray-600">
              Yes. Create a separate client with the Sandbox environment in Enode, then add it
              as a separate account in EVConduit using the sandbox URLs. This lets you test with
              virtual vehicles without affecting production users.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">What happens if I lose my Client Secret?</h3>
            <p className="text-sm text-gray-600">
              You can generate a new secret from the Enode Dashboard. After regenerating,
              update the secret in EVConduit&apos;s Enode Accounts admin page and test the
              connection again.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Do I need to set up webhooks manually in Enode?</h3>
            <p className="text-sm text-gray-600">
              No. EVConduit automatically creates and manages webhook subscriptions for each
              Enode account. You only need to provide the webhook secret so EVConduit can verify
              incoming events.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
