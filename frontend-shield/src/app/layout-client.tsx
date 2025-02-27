'use client';

import { Suspense} from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/app/components/ui/toaster';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import Loading from '@/app/components/common/Loading';
import { ErrorBoundary } from '@/app/components/common/ErrorBoundary';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Create the wrapper component that will load Wagmi dynamically
const WagmiWrapper = dynamic(
  () => import('@/app/components/WagmiWrapper').then((mod) => mod.WagmiWrapper),
  { 
    ssr: false,
    loading: () => <Loading />
  }
);

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');

  return (
    <ErrorBoundary>
      <WagmiWrapper>
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
      </WagmiWrapper>
    </ErrorBoundary>
  );
}