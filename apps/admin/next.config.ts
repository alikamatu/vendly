import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/forgot-password',
        destination: '/auth/forgot-password',
        permanent: false,
      },
      {
        source: '/reset-password',
        destination: '/auth/reset-password',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
