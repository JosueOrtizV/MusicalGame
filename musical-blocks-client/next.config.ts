import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack resolves @shared/types via tsconfig paths automatically
  // No explicit alias needed — Next.js reads tsconfig.json paths
  turbopack: {},
  allowedDevOrigins: ['192.168.100.11'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none';",
          },
        ],
      },
      {
        // Cache 3D models aggressively
        source: '/models/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache audio files aggressively
        source: '/audio/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
