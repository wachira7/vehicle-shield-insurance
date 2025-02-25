//src/app/layout.tsx
'use client';

import { WagmiProvider } from 'wagmi';
import { config } from '@/config/wagmi';
import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Inter } from 'next/font/google';
import { Toaster } from '@/app/components/ui/toaster';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import Loading from '@/app/components/common/Loading';
import { ErrorBoundary } from '@/app/components/common/ErrorBoundary';
import { usePathname } from 'next/navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Note: With 'use client', metadata needs to be handled differently
// You may need to move this to a separate metadata.ts file
export const metadata = {
  title: 'VehicleShield - Decentralized Vehicle Insurance',
  description: 'Protect your vehicle with blockchain-powered insurance that is transparent, efficient, and hassle-free.',
  keywords: 'blockchain insurance, vehicle insurance, decentralized insurance, smart contracts, vehicle protection',
  authors: [{ name: 'VehicleShield Team' }],
  openGraph: {
    title: 'VehicleShield - Decentralized Vehicle Insurance',
    description: 'Blockchain-powered vehicle insurance that is transparent, efficient, and hassle-free.',
    url: 'https://vehicleshield.com',
    siteName: 'VehicleShield',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VehicleShield - Decentralized Vehicle Insurance',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VehicleShield - Decentralized Vehicle Insurance',
    description: 'Blockchain-powered vehicle insurance that is transparent, efficient, and hassle-free.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');

  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <WagmiProvider config={config}>
            <AuthProvider>
              <div className="flex flex-col min-h-screen">
                {/* Only show Header on non-dashboard pages */}
                {!isDashboardRoute && <Header />}
                
                <Suspense fallback={<Loading />}>
                  <main className={`flex-grow ${!isDashboardRoute ? 'pt-16' : ''}`}>
                    {children}
                  </main>
                </Suspense>
                
                {/* Only show Footer on non-dashboard pages */}
                {!isDashboardRoute && <Footer />}
                
                <Toaster />
              </div>
            </AuthProvider>
          </WagmiProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}