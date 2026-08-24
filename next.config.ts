import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    // Voice notes and images are posted to server actions as FormData.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
