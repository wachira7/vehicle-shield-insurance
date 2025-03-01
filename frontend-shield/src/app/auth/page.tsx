// src/app/auth/page.tsx
'use client'
import { useState } from 'react'
import { SignupForm } from '../components/authentication/SignupForm'
import { LoginForm } from '../components/authentication/LoginForm'
import { PasswordReset } from '../components/authentication/PasswordReset'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '../components/common/LoadingScreen'
import { ErrorAlert } from '../components/common/ErrorAlert'
import { useAuth } from '@/context/AuthContext'

type AuthView = 'login' | 'signup' | 'reset'

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('login')
  const { loading, error, clearError } = useAuth()

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {view === 'login' ? 'Welcome Back' : 
             view === 'signup' ? 'Create Account' : 
             'Reset Password'}
          </h1>
          <p className="mt-2 text-gray-600">
            {view === 'login' ? 'Sign in to your account' :
             view === 'signup' ? 'Get started with VehicleShield' :
             'We\'ll send you a reset link'}
          </p>
        </div>

        {/* Auth Forms */}
        <div className="bg-white rounded-xl shadow-lg p-6 relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              custom={view === 'login' ? -1 : 1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
            >
              {view === 'login' && (
                <LoginForm 
                  onForgotPassword={() => setView('reset')}
                  onSignupClick={() => setView('signup')}
                />
              )}
              {view === 'signup' && (
                <SignupForm 
                  onLoginClick={() => setView('login')}
                />
              )}
              {view === 'reset' && (
                <PasswordReset 
                  onBack={() => setView('login')}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* View Toggle */}
          <div className="mt-6 text-center text-sm">
            {view === 'login' ? (
              <p className="text-gray-600">
                {/* You do not have an account?{' '} */}
                <button
                  onClick={() => setView('signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up
                </button>
              </p>
            ) : view === 'signup' ? (
              <p className="text-gray-600">
                {/* Already have an account?{' '} */}
                <button
                  onClick={() => setView('login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Log in
                </button>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <ErrorAlert 
            message={error} 
            onDismiss={clearError}
          />
        )}
      </AnimatePresence>
    </div>
  )
}