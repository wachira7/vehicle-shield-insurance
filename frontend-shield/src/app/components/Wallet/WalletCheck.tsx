//src/app/components/Wallet/WalletCheck.tsx
'use client';

import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from './ConnectButton';
import { Wallet } from 'lucide-react';
import { Card } from '@/app/components/ui/card';

interface WalletCheckProps {
  children: ReactNode;
  message?: string;
  title?: string;
  required?: boolean; // New prop to conditionally require wallet connection
  fallback?: ReactNode; // Custom fallback content when wallet is not connected
}

export function WalletCheck({ 
  children, 
  message = "You need to connect your wallet to perform this action.",
  title = "Wallet Connection Required",
  required = true, // Default to requiring wallet connection for backward compatibility
  fallback = null
}: WalletCheckProps) {
  const { isConnected } = useAccount();

  // If wallet connection is not required or user is connected, render children
  if (!required || isConnected) {
    return <>{children}</>;
  }

  // If fallback content is provided, render that instead of the default card
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default wallet connection prompt
  return (
    <Card className="p-6 my-4 border-amber-200 bg-amber-50">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="rounded-full bg-amber-100 p-3">
          <Wallet className="h-6 w-6 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-amber-800">{title}</h3>
          <p className="text-amber-700">{message}</p>
        </div>
        <ConnectButton className="bg-amber-600 hover:bg-amber-700" />
      </div>
    </Card>
  );
}