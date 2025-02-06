'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Image from 'next/image'

export const AuthForm = () => {
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 px-4 py-3 
                   rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        ) : (
          <>
            <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
            Continue with Google
          </>
        )}
      </button>
    </div>
  )
}