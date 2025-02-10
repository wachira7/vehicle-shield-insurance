'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'
import Image from 'next/image'

interface SignupFormProps {
  onLoginClick: () => void;
}

export const SignupForm = ({ onLoginClick }: SignupFormProps) => {
  const { signUpWithEmail, signInWithGoogle, error, loading, clearError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [validations, setValidations] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  })

  useEffect(() => {
    setValidations({
      minLength: formData.password.length >= 8,
      hasUpperCase: /[A-Z]/.test(formData.password),
      hasLowerCase: /[a-z]/.test(formData.password),
      hasNumber: /\d/.test(formData.password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
    })
  }, [formData.password])

  const isPasswordValid = Object.values(validations).every(Boolean)
  const doPasswordsMatch = formData.password === formData.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) {
      return
    }
    if (!doPasswordsMatch) {
      return
    }
    await signUpWithEmail(formData.email, formData.password)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            aria-label="Email Address"
            value={formData.email}
            onChange={(e) => {
              if (error) clearError()
              setFormData(prev => ({ ...prev, email: e.target.value }))
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              aria-label="Password"
              value={formData.password}
              onChange={(e) => {
                if (error) clearError()
                setFormData(prev => ({ ...prev, password: e.target.value }))
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
          {formData.password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2"
            >
              <PasswordStrengthIndicator 
                password={formData.password}
                validations={validations}
              />
            </motion.div>
          )}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            aria-label="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => {
              if (error) clearError()
              setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
            }}
            className={`mt-1 block w-full rounded-md border px-3 py-2 transition-colors duration-200 ${
              formData.confirmPassword
                ? doPasswordsMatch
                  ? 'border-green-500'
                  : 'border-red-500'
                : 'border-gray-300'
            }`}
            required
          />
          {formData.confirmPassword && !doPasswordsMatch && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 text-sm text-red-500"
            >
              Passwords do not match
            </motion.p>
          )}
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
          disabled={loading || !isPasswordValid || !doPasswordsMatch}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 
                   transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
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
                 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Image src="/images/7123025_logo_google_g_icon.png" alt="Google logo" className="w-5 h-5" />
        Google
      </button>

      <div className="text-center text-sm">
        <span className="text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onLoginClick}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Log in
          </button>
        </span>
      </div>
    </motion.div>
  )
}