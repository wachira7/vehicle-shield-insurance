'use client'
import { useState, useEffect } from 'react'
import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { WalletModal } from './WalletModal'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { sepolia } from 'viem/chains'

interface ConnectButtonProps {
  className?: string;
  redirectTo?: string;
}

export const ConnectButton = ({ className, redirectTo }: ConnectButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const { address, isConnected, status } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain()

  // Set mounted state after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle redirect after successful connection
  useEffect(() => {
    if (mounted && isConnected && redirectTo) {
      router.push(redirectTo)
    }
  }, [mounted, isConnected, redirectTo, router])

  // Handle network switching
  useEffect(() => {
    if (mounted && isConnected && chainId !== sepolia.id && switchChain) {
      switchChain({ chainId: sepolia.id })
    }
  }, [mounted, chainId, isConnected, switchChain])

  // Handle connection status
  useEffect(() => {
    if (!mounted) return
    
    if (status === 'connecting') {
      setIsLoading(true)
      setError(null)
    } else if (status === 'disconnected') {
      setIsLoading(false)
      setError(null)
    } else if (status === 'connected') {
      setIsLoading(false)
      setError(null)
    }
  }, [mounted, status])

  // Error handling
  const handleError = (error: Error) => {
    setError(error.message)
    setTimeout(() => setError(null), 5000)
  }

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      setIsLoading(true)
      await disconnect()
    } catch (error) {
      handleError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render anything meaningful until after client-side hydration
  if (!mounted) {
    return <button className={`bg-blue-600 text-white px-6 py-2 rounded-lg opacity-50 ${className}`}>
      Connect Wallet
    </button>
  }

  // If connected, show address and disconnect button
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        {chainId !== sepolia.id && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-500">Wrong Network</span>
            <button
              onClick={() => switchChain({ chainId: sepolia.id })}
              disabled={isSwitchingNetwork}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 
                       transition-colors duration-200 disabled:opacity-50"
            >
              {isSwitchingNetwork ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                'Switch to Sepolia'
              )}
            </button>
          </div>
        )}
        <span className="text-sm font-medium">
          {`${address.slice(0, 6)}...${address.slice(-4)}`}
        </span>
        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className={`bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 
                     transition-colors duration-200 disabled:opacity-50 ${className}`}
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            'Disconnect'
          )}
        </button>
      </div>
    )
  }

  // If not connected, show connect button and modal
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading}
        className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 
                   transition-colors duration-200 disabled:opacity-50 ${className}`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin h-5 w-5" />
            <span>Connecting...</span>
          </div>
        ) : (
          'Connect Wallet'
        )}
      </button>
      <WalletModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
    </>
  )
}