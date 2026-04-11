import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs'],
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
};

export default nextConfig;
