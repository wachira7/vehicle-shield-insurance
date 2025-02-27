//Create a client component for the actual layout (src/app/layout-client.tsx)
'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/wagmi';
import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/app/components/ui/toaster';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import Loading from '@/app/components/common/Loading';
import { ErrorBoundary } from '@/app/components/common/ErrorBoundary';
import { usePathname } from 'next/navigation';

const queryClient = new QueryClient();

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');

  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
       <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}