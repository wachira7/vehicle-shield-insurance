import { useConnect } from 'wagmi'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { Wallet, Coins, CreditCard, Plug, LucideIcon  } from 'lucide-react'

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}


type WalletOption ={
    name: string;
    Icon: LucideIcon;  // Using LucideIcon type
    connector: Connector | undefined;   
  }

export const WalletModal = ({ isOpen, onClose }: WalletModalProps) => {
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()

  const wallets = [
    {
      name: 'MetaMask',
      Icon: Wallet,
      connector: connectors.find(c => c instanceof MetaMaskConnector)
    },
    {
      name: 'WalletConnect',
      Icon: CreditCard,
      connector: connectors.find(c => c instanceof WalletConnectConnector)
    },
    {
      name: 'Coinbase Wallet',
      Icon: Coins,
      connector: connectors.find(c => c instanceof CoinbaseWalletConnector)
    },
    {
        name: 'Browser Wallet',
        Icon: Plug,
        connector: connectors.find(c => c instanceof InjectedConnector)
      }

  ]satisfies WalletOption[]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Connect Wallet</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {wallets.map((wallet) => {
            const { Icon } = wallet
            return (
              <button
                key={wallet.name}
                onClick={() => {
                  if (wallet.connector) {
                    connect({ connector: wallet.connector })
                    onClose()
                  }
                }}
                disabled={!wallet.connector?.ready}
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-blue-50 
                         transition-colors duration-200 disabled:opacity-50"
              >
                <Icon className="w-10 h-10 mb-2 text-blue-600" />
                <span className="text-sm font-medium">{wallet.name}</span>
                {isLoading && pendingConnector === wallet.connector && 
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