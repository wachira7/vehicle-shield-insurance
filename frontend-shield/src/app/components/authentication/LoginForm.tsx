//src/components/authentication/LoginForm.tsx
'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

interface LoginFormProps {
  onForgotPassword: () => void;
  onSignupClick: () => void;
}

export const LoginForm = ({ onForgotPassword, onSignupClick }: LoginFormProps) => {
  const { signInWithEmail, signInWithGoogle, error, loading, clearError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signInWithEmail(formData.email, formData.password)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            aria-label="Email Address"
            value={formData.email}
            onChange={(e) => {
              if (error) clearError()
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Forgot Password?
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              aria-label="Password"
              value={formData.password}
              onChange={(e) => {
                if (error) clearError()
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm mt-1"
          >
            {error}
          </motion.p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <button
        onClick={() => signInWithGoogle()}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 
                   bg-white text-gray-700 py-2 rounded-md hover:bg-gray-50 
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Image src="/images/7123025_logo_google_g_icon.png" alt="Google logo" width={20} height={20} />
        Google
      </button>
      <div className="text-center text-sm">
        <span className="text-gray-600">
          Don&apos;t have an account?{' '}
          <button
            onClick={onSignupClick}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign up
          </button>
        </span>
      </div> 
    </motion.div>
  )
}