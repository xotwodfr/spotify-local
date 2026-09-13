import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    // Cap the Turbopack engine's memory target (in bytes) so production builds
    // stay reliable on machines with ~10 GB of free RAM. Build-time only.
    turbopackMemoryLimit: 4 * 1024 * 1024 * 1024,
  },
};

export default nextConfig;
