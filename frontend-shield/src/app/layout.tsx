//  (src/app/layout.tsx)
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientLayout from './layout-client';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
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
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}