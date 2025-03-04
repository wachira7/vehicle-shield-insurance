//src/app/dashboard/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAccount } from 'wagmi';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/app/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { isConnecting } = useAccount(); // Only check isConnecting, not isConnected
  const router = useRouter();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  
  // Check authentication only once when the component mounts
  useEffect(() => {
    if (!authLoading && !isConnecting && !initialCheckDone) {
      // If auth is done loading and user is not authenticated, redirect to login
      if (!user) {
        router.push('/auth');
      }
      setInitialCheckDone(true);
    }
  }, [user, authLoading, isConnecting, router, initialCheckDone]);

  // Show loading state while checking auth
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // Return the layout - allowing access regardless of wallet connection
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-16 xl:ml-64 pt-16 lg:pt-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}