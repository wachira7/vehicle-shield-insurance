import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The shared protocol package ships TypeScript source.
  transpilePackages: ["@vehicle-shield/protocol"],
  images: { formats: ["image/avif", "image/webp"] },
  // Account moved into the dashboard.
  async redirects() {
    return [{ source: "/account", destination: "/dashboard/account", permanent: true }];
  },
};

export default nextConfig;
