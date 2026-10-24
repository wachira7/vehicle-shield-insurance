import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The shared protocol package ships TypeScript source.
  transpilePackages: ["@vehicle-shield/protocol"],
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    return [
      // Account moved into the dashboard.
      { source: "/account", destination: "/dashboard/account", permanent: true },
      // The assessor console moved out of the customer dashboard into its own workspace.
      { source: "/dashboard/assessor/:path*", destination: "/assessor/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
