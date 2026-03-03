// src/app/(public)/page.tsx
import LandingPage from '@/components/pages/LandingPage';

export const metadata = {
  // Hardcoded string
  title: 'EVConduit – Smarter EV integration for Home Assistant',
  // Hardcoded string
  description:
    'EVConduit connects your electric vehicle to Home Assistant using Enode and/or ABRP. Open-source, secure, and easy to use.',
  // Hardcoded string array
  keywords: [
    'EVConduit',
    'electric vehicle',
    'Home Assistant',
    'EV integration',
    'Enode',
    'ABRP',
    'smart charging',
    'open source',
  ],
  openGraph: {
    // Hardcoded string
    title: 'EVConduit – Smarter EV integration for Home Assistant',
    // Hardcoded string
    description:
      'EVConduit connects your EV to Home Assistant using Enode and/or ABRP. Secure and open-source.',
    url: 'https://evconduit.com/',
    // Hardcoded string
    siteName: 'EVConduit',
    images: [
      {
        url: 'https://evconduit.com/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US', // Locale, should be dynamic for i18n
    type: 'website', // Hardcoded string
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LandingPageRoute() {
  return <LandingPage />;
}
