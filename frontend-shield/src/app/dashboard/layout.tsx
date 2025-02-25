//src/app/dashboard/layout.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useAccount } from 'wagmi';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { isConnected, isConnecting } = useAccount();
  const router = useRouter();
  
  // Check authentication and redirect if needed
  useEffect(() => {
    if (!authLoading && !isConnecting) {
      // If auth is done loading and user is not authenticated, redirect to login
      if (!user) {
        router.push('/auth');
        return;
      }
      
      // If user is authenticated but wallet is not connected, redirect to connect wallet
      if (!isConnected) {
        router.push('/auth?connect=true');
        return;
      }
    }
  }, [user, authLoading, isConnected, isConnecting, router]);

  // Show loading state while checking auth
  if (authLoading || isConnecting || !user || !isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg">Loading your dashboard...</span>
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