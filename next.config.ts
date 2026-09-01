import type { NextConfig } from 'next';

/** D-208: no server code, no API routes, no env vars — `next build` emits a static site. */
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
