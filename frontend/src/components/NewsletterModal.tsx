// src/components/NewsletterModal.tsx

'use client';

import { useState, useEffect } from 'react';

/**
 * NewsletterModal shows a small banner at the bottom of the screen directing
 * users to the Discord community for updates. Once dismissed, it will not
 * show again.
 */
export default function NewsletterModal() {
  const [visible, setVisible] = useState(false);

  const hasDismissedLocal =
    typeof window !== 'undefined' &&
    localStorage.getItem('newsletterModalDismissed') === 'true';

  useEffect(() => {
    if (hasDismissedLocal) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [hasDismissedLocal]);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('newsletterModalDismissed', 'true');
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
      <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-lg mx-4 sm:mx-auto flex items-center">
        <div className="flex-1">
          <p className="text-gray-800 mb-2">
            Updates and announcements are posted in the Discord{' '}
            <strong>#software-talk</strong> channel.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <a
              href="https://discord.com/channels/1274099103537828013/1274100550660788266"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-center"
            >
              Open #software-talk
            </a>
            <a
              href="https://discord.gg/6BzmqfZaAf"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-center"
            >
              Join Discord
            </a>
          </div>
        </div>

        <button
          className="text-gray-500 hover:text-gray-700 ml-4"
          onClick={handleClose}
          aria-label="Close banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
