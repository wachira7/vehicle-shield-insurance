import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  // Account moved into the dashboard.
  async redirects() {
    return [{ source: "/account", destination: "/dashboard/account", permanent: true }];
  },
};

export default nextConfig;
