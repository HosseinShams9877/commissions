import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: {
    // CI/CD environments may need this; production should ideally have zero TS errors
    ignoreBuildErrors: process.env.NODE_ENV === 'production' ? false : true,
  },
};

export default nextConfig;
