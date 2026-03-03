import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable static page generation for routes that need runtime env vars
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media2.giphy.com',
        pathname: '/media/v1/**',
      },
    ],
  },
  async rewrites() {
    const trackerUrl = process.env.XPENG_TRACKER_URL || 'http://xpeng-tracker:3000';
    return [
      {
        source: '/xpeng-tracker',
        destination: `${trackerUrl}/xpeng-tracker`,
      },
      {
        source: '/xpeng-tracker/:path*',
        destination: `${trackerUrl}/xpeng-tracker/:path*`,
      },
    ];
  },
};

export default nextConfig;
