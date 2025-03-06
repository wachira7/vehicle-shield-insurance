//src/app/components/Wallet/WalletModal.tsx
'use client'
import { useConnect, type Connector } from 'wagmi'
import { Wallet, Coins, CreditCard, Plug, Shield, Ghost, LucideIcon, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

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
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  
  // Reset connecting state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsConnecting(null)
    }
  }, [isOpen])

  // Debug: Log available connectors
  useEffect(() => {
    if (isOpen) {
      console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));
    }
  }, [isOpen, connectors]);
  
  // Map of wallet connectors
  const wallets: WalletOption[] = [
    {
      name: 'MetaMask',
      Icon: Wallet,
      id: 'injected'
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

  const handleConnect = async (connector: Connector) => {
    try {
      setIsConnecting(connector.id)
      await connect({ connector })
      onClose()
    } catch (error) {
      console.error('Connection error:', error)
    } finally {
      setIsConnecting(null)
    }
  }

  // Check if WalletConnect is available
  const hasWalletConnect = connectors.some(c => c.id === 'walletConnect')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Connect Wallet</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        {!hasWalletConnect && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            WalletConnect requires a project ID. Please check your environment configuration.
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          {wallets.map((wallet) => {
            const connector = connectors.find(c => c.id === wallet.id)
            const { Icon } = wallet
            const isWalletConnecting = isConnecting === wallet.id
            
            return (
              <button
                key={wallet.name}
                onClick={() => connector && handleConnect(connector)}
                disabled={!connector?.ready || isPending || isConnecting !== null}
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-blue-50 
                         transition-colors duration-200 disabled:opacity-50"
              >
                {isWalletConnecting ? (
                  <Loader2 className="w-10 h-10 mb-2 text-blue-600 animate-spin" />
                ) : (
                  <Icon className="w-10 h-10 mb-2 text-blue-600" />
                )}
                <span className="text-sm font-medium">{wallet.name}</span>
                {isWalletConnecting && 
                  <span className="text-xs text-blue-600 mt-1">Connecting...</span>
                }
                {!connector && 
                  <span className="text-xs text-red-500 mt-1">Not Available</span>
                }
              </button>
            )
          })}
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error.message}
          </div>
        )}
      </div>
    </div>
  )
}