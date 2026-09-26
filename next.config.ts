import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // `npm run typecheck` remains the required type gate. This avoids a Next.js
  // 16 / Node 24 build-runner issue parsing TypeScript's valid --showConfig JSON.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
