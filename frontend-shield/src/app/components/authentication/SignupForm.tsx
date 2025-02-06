// src/app/components/authentication/SignupForm.tsx
'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'

export const SignupForm = () => {
  const { signUpWithEmail, error, loading, clearError } = useAuth()
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
      clearError()
      return
    }
    if (!doPasswordsMatch) {
      clearError()
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
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => {
              clearError()
              setFormData({ ...formData, email: e.target.value })
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => {
                clearError()
                setFormData({ ...formData, password: e.target.value })
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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
          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) => {
              clearError()
              setFormData({ ...formData, confirmPassword: e.target.value })
            }}
            className={`mt-1 block w-full rounded-md border px-3 py-2 ${
              formData.confirmPassword
                ? doPasswordsMatch
                  ? 'border-green-500'
                  : 'border-red-500'
                : 'border-gray-300'
            }`}
            required
          />
          {formData.confirmPassword && !doPasswordsMatch && (
            <p className="mt-1 text-sm text-red-500">Passwords do not match</p>
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm"
          >
            {error}
          </motion.p>
        )}
        <button
          type="submit"
          disabled={loading || !isPasswordValid || !doPasswordsMatch}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
    </motion.div>
  )
}