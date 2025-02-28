//src/app/dashboard/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useAccount } from 'wagmi';
import { Loader2 } from 'lucide-react';
import { ConnectButton } from '@/app/components/Wallet/ConnectButton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { isConnected, isConnecting } = useAccount();
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
  if (authLoading || isConnecting || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // Instead of redirecting when wallet is not connected, 
  // show a connect wallet prompt in the dashboard
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-6 p-8 max-w-md border rounded-lg shadow-lg bg-white">
          <h2 className="text-2xl font-bold text-gray-800">Connect Your Wallet</h2>
          <p className="text-gray-600 text-center">
            You need to connect your wallet to access the dashboard features.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 p-6 ml-0 lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}