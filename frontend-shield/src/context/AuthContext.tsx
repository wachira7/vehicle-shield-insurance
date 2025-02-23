'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { FirebaseError } from 'firebase/app'
import { useRouter } from 'next/navigation'
import { LoadingScreen } from '@/app/components/common/LoadingScreen'
import { useAccount } from 'wagmi'

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  // Get wallet state from wagmi
  const { address, isConnected } = useAccount()

  // Listen for Firebase auth state and wallet changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Store wallet address in user metadata if connected
        if (isConnected && address) {
          firebaseUser.getIdTokenResult(true).then(() => {
            // Update user metadata in your backend/database here
            // This is where you'd store the wallet address associated with the user
            console.log('Wallet connected:', address)
          })
        }
        setUser(firebaseUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [address, isConnected])

  const handleAuthError = (error: unknown) => {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered')
          break
        case 'auth/invalid-email':
          setError('Invalid email address')
          break
        case 'auth/weak-password':
          setError('Password does not meet requirements')
          break
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password')
          break
        case 'auth/popup-closed-by-user':
          setError('Sign in was cancelled')
          break
        case 'auth/network-request-failed':
          setError('Network error. Please check your connection')
          break
        default:
          setError(`Authentication error: ${error.message}`)
      }
    } else {
      setError('An unexpected error occurred')
    }
  }

  const clearError = () => setError(null)

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      clearError()
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      if (result.user) {
        // If wallet is already connected, associate it with the user
        if (isConnected && address) {
          // Update user metadata in your backend/database here
          console.log('Associating wallet:', address)
        }
        router.push('/dashboard')
      }
    } catch (error) {
      handleAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      clearError()
      const result = await signInWithEmailAndPassword(auth, email, password)
      if (result.user) {
        // If wallet is already connected, associate it with the user
        if (isConnected && address) {
          // Update user metadata in your backend/database here
          console.log('Associating wallet:', address)
        }
        router.push('/dashboard')
      }
    } catch (error) {
      handleAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      clearError()
      
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors.join('\n'));
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, email, password)
      if (result.user) {
        // If wallet is already connected, associate it with the user
        if (isConnected && address) {
          // Update user metadata in your backend/database here
          console.log('Associating wallet:', address)
        }
        router.push('/dashboard')
      }
    } catch (error) {
      handleAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      clearError()
      await sendPasswordResetEmail(auth, email)
      return true
    } catch (error) {
      handleAuthError(error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      clearError()
      await signOut(auth)
      // No need to manually disconnect wallet here
      // Your ConnectButton component handles that through wagmi
      router.push('/')
    } catch (error) {
      handleAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    logout,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}