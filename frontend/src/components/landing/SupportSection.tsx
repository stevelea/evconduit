'use client';

import { useTranslation } from 'react-i18next';

export default function SupportSection() {
  const { t } = useTranslation();
  return (
    <section className="max-w-4xl mx-auto px-6 py-10 text-center">
      <h2 className="text-2xl font-bold mb-4">{t('landing.support.title')}</h2>
      <p className="text-gray-600 text-base mb-6">
        {t('landing.support.description')}
      </p>

      {/* About This Fork section */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 text-left max-w-2xl mx-auto">
        <h3 className="font-semibold text-blue-900 mb-3 text-lg">About This Fork</h3>
        <p className="text-blue-800 mb-3">
          EVConduit was originally created by <strong>Roger Aspelin</strong> as EVLink. Unfortunately, Roger&apos;s site (evlinkha.se) is currently down and he has not been responding to emails or GitHub messages.
        </p>
        <p className="text-blue-800 mb-3">
          To ensure the community can continue accessing their EV data in Home Assistant, I&apos;ve forked the project and am maintaining it here. <strong>If Roger resurfaces, I&apos;m happy to hand back control</strong> — but in the meantime, this site keeps the service alive.
        </p>
        <p className="text-blue-800">
          Huge thanks to Roger for his original work in creating this fantastic integration!
        </p>
      </div>

      {/* Call-to-action buttons */}
      <div className="flex justify-center gap-3 flex-wrap">
        <a
          href="https://github.com/stevelea/evconduit-homeassistant"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-5 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50"
        >
          {t('landing.support.buttons.starOnGithub')}
        </a>
      </div>
    </section>
  );
}
