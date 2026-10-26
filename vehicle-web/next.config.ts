import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:42069";
const secureBackends = [apiUrl, indexerUrl].every((url) => url.startsWith("https://"));

// What pages may load. Scripts only come from this site ('unsafe-inline' is needed for the
// inline scripts Next.js writes into each page), so an injected <script src> can't run; only the
// wallet's sign-in frames may be embedded; nothing may embed us. Network requests may go to any
// https/wss endpoint, because wallet sign-in talks to many WalletConnect and Reown hosts, plus
// the API and indexer (which may be plain http in local development).
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.reown.com https://fonts.gstatic.com",
  `connect-src 'self' https: wss: ${apiUrl} ${indexerUrl}`,
  "frame-src https://*.walletconnect.org https://*.walletconnect.com https://*.reown.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(secureBackends ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The camera is used for photos; nothing else is.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // Social sign-in opens a popup that reports back to this page.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The shared protocol package ships TypeScript source.
  transpilePackages: ["@vehicle-shield/protocol"],
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
