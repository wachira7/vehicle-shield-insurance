//src/app/components/Wallet/WalletModal.tsx
'use client'
import { useConnect, type Connector } from 'wagmi'
import { Wallet, Coins, CreditCard, Plug, Shield, Ghost, LucideIcon } from 'lucide-react'
import { useEffect } from 'react'

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WalletOption = {
  name: string;
  Icon: LucideIcon;
  id: string;
}


export const WalletModal = ({ isOpen, onClose }: WalletModalProps) => {
  const { connect, connectors, error, isPending } = useConnect()
  
  // Debug: Log available connectors
  useEffect(() => {
    if (isOpen) {
      console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));
    }
  }, [isOpen, connectors]);

  // Update these IDs based on what's logged in the console
  const wallets: WalletOption[] = [
    {
      name: 'MetaMask',
      Icon: Wallet,
      id: 'injected' // This should match the ID from wagmi
    },
    {
      name: 'Trust Wallet',
      Icon: Shield, 
      id: 'injected'
    },
    {
      name: 'Phantom',
      Icon: Ghost, 
      id: 'injected'
    },
    {
      name: 'WalletConnect',
      Icon: CreditCard,
      id: 'walletConnect'
    },
    {
      name: 'Coinbase Wallet',
      Icon: Coins,
      id: 'coinbaseWallet'
    },
    {
      name: 'Browser Wallet',
      Icon: Plug,
      id: 'injected'
    }
  ]

  if (!isOpen) return null

  const handleConnect = (connector: Connector) => {
    console.log('Connecting with:', connector.id, connector.name);
    connect({ connector });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Connect Wallet</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {wallets.map((wallet) => {
            const connector = connectors.find(c => c.id === wallet.id)
            const { Icon } = wallet
            
            // Debug: Log when a connector is missing
            if (!connector) {
              console.log(`No connector found for ${wallet.name} with ID ${wallet.id}`);
            }
            
            return (
              <button
                key={wallet.name}
                onClick={() => connector && handleConnect(connector)}
                disabled={!connector?.ready || isPending}
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-blue-50 
                         transition-colors duration-200 disabled:opacity-50"
              >
                <Icon className="w-10 h-10 mb-2 text-blue-600" />
                <span className="text-sm font-medium">{wallet.name}</span>
                {isPending && 
                  <span className="text-xs text-blue-600 mt-1">(connecting)</span>
                }
              </button>
            )
          })}
        </div>
        {error && (
          <div className="mt-4 text-red-500 text-sm text-center">
            {error.message}
          </div>
        )}
      </div>
    </div>
  )
}