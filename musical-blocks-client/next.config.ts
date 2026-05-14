import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack resolves @shared/types via tsconfig paths automatically
  // No explicit alias needed — Next.js reads tsconfig.json paths
  turbopack: {},
  allowedDevOrigins: ['192.168.100.11'],
};

export default nextConfig;
