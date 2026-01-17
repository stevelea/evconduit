// src/app/contact/page.tsx
'use client';

import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-gray-800">
      {/* Hardcoded string */}
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">Contact</h1>

      {/* Hardcoded string */}
      <p className="mb-4">
        Hi! I&apos;m <strong>Steve Lea</strong>, and I&apos;m maintaining this fork of EVConduit to keep the service running for the community.
      </p>

      {/* Hardcoded string */}
      <p className="mb-4">
        You can reach me directly at:{' '}
        <a href="mailto:stevelea@evconduit.com" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
          <Mail className="w-4 h-4" /> stevelea@evconduit.com
        </a>
      </p>

      {/* Hardcoded string */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <h2 className="font-semibold text-blue-900 mb-2">About This Fork</h2>
        <p className="text-blue-800 mb-2">
          EVConduit was originally created by <strong>Roger Aspelin</strong> as EVLink. Unfortunately, Roger&apos;s site (evlinkha.se) is currently down and he has not been responding to emails or GitHub messages.
        </p>
        <p className="text-blue-800 mb-2">
          To ensure the community can continue accessing their EV data in Home Assistant, I&apos;ve forked the project and am maintaining it here. <strong>If Roger resurfaces, I&apos;m happy to hand back control</strong> — but in the meantime, this site keeps the service alive.
        </p>
        <p className="text-blue-800">
          Huge thanks to Roger for his original work in creating this fantastic integration!
        </p>
      </div>

      {/* Hardcoded string */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
        <h2 className="font-semibold text-yellow-900 mb-2">Vehicle Compatibility</h2>
        <p className="text-yellow-800">
          As an <strong>Xpeng owner</strong>, my primary focus is ensuring compatibility with Xpeng vehicles. Other EV brands may work, but your mileage may vary. Feel free to report issues or successes with other brands!
        </p>
      </div>

      {/* Hardcoded string */}
      <p className="mb-4">
        EVConduit is an <strong>open source project</strong> with a focus on privacy, control and community. While free to use, the service has costs including hosting, API usage and hardware.
      </p>

      {/* Hardcoded string */}
      <p className="text-sm text-gray-500">
        Thank you for your interest and for keeping the EVConduit community alive!
      </p>
    </main>
  );
}
