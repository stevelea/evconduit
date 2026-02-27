'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function MacroDroidGuidePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">XPeng XCombo One-Tap Shortcuts</h1>
        <p className="text-lg text-gray-500 italic mb-1">Using MacroDroid on Android</p>
        <p className="text-sm text-gray-400 mb-8">XPeng Australia Owner Community Guide</p>

        <hr className="my-8 border-gray-200" />

        {/* Overview */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Overview</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            This guide explains how to create one-tap shortcuts on your Android phone that directly execute your
            XPeng XCombo scenes &mdash; similar to iPhone Shortcuts. When triggered, the macro opens the XCombo scene and
            runs it automatically, without any manual interaction.
          </p>
          <h3 className="text-lg font-medium text-gray-800 mb-3">What you need:</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-gray-700 mb-4">
            <li>MacroDroid app installed on your Android phone (free version works)</li>
            <li>XPeng app (<code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">com.xiaopeng.globalcarinfo</code>) installed and logged in</li>
            <li>Your XCombo scene Share Link (to get the Scene ID)</li>
            <li>MacroDroid Accessibility Service enabled</li>
          </ul>
          <div className="bg-indigo-50 border-l-4 border-indigo-300 rounded-r-md p-4 text-sm text-gray-700 italic">
            💡 This method was developed by the XPeng AU owner community through reverse engineering of the XPeng app&apos;s
            internal deep link routing system.
          </div>
        </section>

        {/* Step 1 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 1: Get Your Scene ID</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Each XCombo scene has a unique ID embedded in its share link. Here is how to find it:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-4">
            <li>Open the XPeng app on your phone</li>
            <li>Navigate to <strong>XCombo</strong></li>
            <li>Tap the scene you want to create a shortcut for</li>
            <li>Tap the three-dot menu (⋯) in the top right corner</li>
            <li>Select <strong>Share</strong> or <strong>Copy Link</strong></li>
            <li>Paste the link somewhere (Notes app, etc.) &mdash; it will look like:</li>
          </ol>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm break-all">
              https://app.xiaopeng.com/xcombo/detail?sceneId=4c80084db7824c7fbafc7b0eb03fecc7&amp;vin=L1NNSG*******783
            </code>
          </div>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-4" start={7}>
            <li>Copy the value after <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">sceneId=</code> (the long string of letters and numbers)</li>
            <li>Also note the value after <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">vin=</code> (your vehicle VIN)</li>
          </ol>
          <div className="bg-indigo-50 border-l-4 border-indigo-300 rounded-r-md p-4 text-sm text-gray-700 italic">
            💡 The sceneId is a fixed unique identifier for your scene and will not change. Your VIN is your vehicle&apos;s
            identification number and is the same for all your XCombo shortcuts.
          </div>
        </section>

        {/* Step 2 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 2: Enable MacroDroid Accessibility Service</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            MacroDroid needs Accessibility permission to simulate screen taps. This is required to automatically press
            the Run and Confirm buttons.
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-4">
            <li>Open <strong>Android Settings</strong></li>
            <li>Go to <strong>Accessibility</strong></li>
            <li>Tap <strong>Installed Services</strong> (or Downloaded Apps)</li>
            <li>Find <strong>MacroDroid</strong> and tap it</li>
            <li>Toggle it <strong>ON</strong> and confirm</li>
          </ol>
          <div className="bg-indigo-50 border-l-4 border-indigo-300 rounded-r-md p-4 text-sm text-gray-700 italic">
            💡 Without Accessibility enabled, the tap actions in the macro will not work.
          </div>
        </section>

        {/* Step 3 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 3: Create the MacroDroid Macro</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Open MacroDroid and create a new macro. Add the following actions in order:
          </p>

          <h3 className="text-lg font-medium text-gray-800 mb-3">Actions</h3>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="px-4 py-3 text-left font-semibold w-12">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                  <th className="px-4 py-3 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 font-bold">1</td>
                  <td className="px-4 py-3 font-medium">Launch App → XPeng</td>
                  <td className="px-4 py-3">Select XPeng from the app list &mdash; this pre-warms the app</td>
                </tr>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-bold">2</td>
                  <td className="px-4 py-3 font-medium">Wait → 3000ms</td>
                  <td className="px-4 py-3">Gives the app time to fully initialise and connect</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 font-bold">3</td>
                  <td className="px-4 py-3 font-medium">Send Intent</td>
                  <td className="px-4 py-3">See configuration below</td>
                </tr>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-bold">4</td>
                  <td className="px-4 py-3 font-medium">Wait → 3000ms</td>
                  <td className="px-4 py-3">Waits for the XCombo detail screen to load</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 font-bold">5</td>
                  <td className="px-4 py-3 font-medium">Shell Script</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">input tap 1040 2720</code></td>
                </tr>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-bold">6</td>
                  <td className="px-4 py-3 font-medium">Wait → 1000ms</td>
                  <td className="px-4 py-3">Waits for the confirmation dialog to appear</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 font-bold">7</td>
                  <td className="px-4 py-3 font-medium">Shell Script</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">input tap 1050 1970 &amp;&amp; sleep 1 &amp;&amp; input keyevent 4</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium text-gray-800 mb-3">Action 3 &mdash; Send Intent Configuration</h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            In the Send Intent action, fill in the following fields:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li><strong>Action:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">android.intent.action.VIEW</code></li>
            <li><strong>Data / URI:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm break-all">xiaopeng://www.xiaopeng.com/common/car/xcombo/detail?sceneId=YOUR_SCENE_ID&amp;vin=YOUR_VIN</code></li>
            <li><strong>Package:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">com.xiaopeng.globalcarinfo</code></li>
            <li><strong>Target:</strong> Activity</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-3">
            Replace <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">YOUR_SCENE_ID</code> and <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">YOUR_VIN</code> with
            the values you copied in Step 1. For example:
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6 overflow-x-auto">
            <code className="text-sm break-all">
              xiaopeng://www.xiaopeng.com/common/car/xcombo/detail?sceneId=4c80084db7824c7fbafc7b0eb03fecc7&amp;vin=L1NNSG*******783
            </code>
          </div>

          <h3 className="text-lg font-medium text-gray-800 mb-3">Shell Script Actions Explained</h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            <strong>Action 5</strong> taps the Run button at the bottom right of the XCombo detail screen:
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm">input tap 1040 2720</code>
          </div>
          <p className="text-gray-700 leading-relaxed mb-3">
            <strong>Action 7</strong> taps the Confirm button on the confirmation dialog, waits 1 second, then presses Back
            to return to the home screen:
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm">input tap 1050 1970 &amp;&amp; sleep 1 &amp;&amp; input keyevent 4</code>
          </div>
          <div className="bg-indigo-50 border-l-4 border-indigo-300 rounded-r-md p-4 text-sm text-gray-700 italic">
            💡 These tap coordinates are based on a 1440x3168 screen resolution (common on modern Android phones).
            If your phone has a different resolution, the coordinates may need adjusting. Take a screenshot of the
            XCombo detail screen and the confirmation dialog, then measure the button positions.
          </div>
        </section>

        {/* Step 4 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 4: Add a Trigger</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Choose how you want to activate your shortcut. MacroDroid supports many trigger types:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li><strong>Home Screen Widget</strong> &mdash; tap a button on your home screen (recommended)</li>
            <li><strong>Quick Settings Tile</strong> &mdash; swipe down the notification shade and tap a tile</li>
            <li><strong>NFC Tag</strong> &mdash; tap your phone on an NFC sticker placed in your car</li>
            <li><strong>Floating Button</strong> &mdash; an always-visible overlay button</li>
            <li><strong>Voice</strong> &mdash; trigger via Google Assistant</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-3">
            For a home screen widget trigger, in MacroDroid:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700">
            <li>Tap <strong>Add Trigger</strong></li>
            <li>Select <strong>Widget / Shortcut</strong></li>
            <li>Choose a name and icon for your shortcut</li>
            <li>Long press your home screen and add the MacroDroid widget</li>
          </ol>
        </section>

        {/* Step 5 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Step 5: Test the Macro</h2>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-4">
            <li>Go to your home screen (or wherever your trigger is)</li>
            <li>Activate the trigger</li>
            <li>Watch the XPeng app open, navigate to your scene, and execute it automatically</li>
          </ol>
          <div className="bg-indigo-50 border-l-4 border-indigo-300 rounded-r-md p-4 text-sm text-gray-700 italic">
            💡 If you get an &apos;Oops Server Error&apos;, the app may not have fully initialised. Try increasing the wait
            time in Action 2 from 3000ms to 5000ms.
          </div>
        </section>

        {/* Multiple Scenes */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Creating Shortcuts for Multiple Scenes</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            For each additional XCombo scene you want a shortcut for:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-4">
            <li>Get the sceneId from the scene&apos;s share link (Step 1)</li>
            <li>In MacroDroid, duplicate your existing macro (long press → Duplicate)</li>
            <li>Edit Action 3 &mdash; change only the sceneId value in the URI</li>
            <li>Rename the macro to match the scene name</li>
            <li>Add a new trigger with a different icon/name</li>
          </ol>
          <p className="text-gray-700 leading-relaxed">
            All other actions remain identical &mdash; only the sceneId changes between macros.
          </p>
        </section>

        {/* Troubleshooting */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Troubleshooting</h2>

          <h3 className="text-lg font-medium text-gray-800 mb-2 mt-6">Oops Server Error</h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            The XPeng app returned an error loading the scene. Usually a timing issue.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-gray-700 mb-4">
            <li>Increase Action 2 wait time to 5000ms</li>
            <li>Make sure you are connected to the internet</li>
            <li>Make sure the XPeng app is logged in</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2 mt-6">Tap Actions Not Working</h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            The shell script tap commands are not pressing the right buttons.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-gray-700 mb-4">
            <li>Ensure MacroDroid Accessibility Service is enabled (Step 2)</li>
            <li>Your phone screen resolution may be different &mdash; adjust coordinates</li>
            <li>Take a screenshot during the XCombo detail screen and measure button positions</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2 mt-6">App Not Opening</h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            The XPeng app fails to launch.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-gray-700 mb-4">
            <li>Verify the package name is <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">com.xiaopeng.globalcarinfo</code></li>
            <li>Ensure the app is installed and not force-stopped</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2 mt-6">Scene Runs When Car is Off</h3>
          <p className="text-gray-700 leading-relaxed">
            XPeng shows a confirmation dialog saying the scene will run before the vehicle is turned on. This is normal
            for Remote XCombo scenes. The macro handles this automatically by tapping the Confirm button in Action 7.
          </p>
        </section>

        {/* Technical Background */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technical Background</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            This guide was developed by analysing the XPeng app&apos;s internal routing system using ADB and APK inspection.
            Key findings:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-gray-700">
            <li>The XPeng app uses ARouter for internal navigation with the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">xiaopeng://</code> URL scheme</li>
            <li>XCombo scenes are accessible via the deep link path <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">/common/car/xcombo/detail</code></li>
            <li>Scene IDs are stable UUIDs that do not change</li>
            <li>There is no direct execute API exposed &mdash; the Run button tap is required</li>
            <li>The confirmation dialog appears for Remote XCombo scenes when the car is off</li>
          </ul>
        </section>

        <hr className="my-8 border-gray-200" />
        <p className="text-sm text-gray-400 text-center italic">XPeng Australia Owner Community &bull; 2026</p>
      </div>
    </main>
  );
}
