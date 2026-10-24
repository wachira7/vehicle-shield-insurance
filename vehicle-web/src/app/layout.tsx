import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "VehicleShield: car insurance you can check", template: "%s · VehicleShield" },
  description:
    "Get a car insurance price in seconds, no sign-up needed. Policies, claims and the pool that pays them are open for anyone to check.",
};

export const viewport: Viewport = { themeColor: "#0a1020", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Marks JavaScript as available before paint, so scroll reveals can start hidden. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-action focus:px-4 focus:py-2 focus:text-action-ink">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
