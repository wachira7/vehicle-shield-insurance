// src/components/common/ErrorAlert.tsx
import { motion } from 'framer-motion'
import { XCircle } from 'lucide-react'

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorAlert = ({ message, onDismiss }: ErrorAlertProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg 
                 shadow-lg border border-red-200 max-w-md"
    >
      <div className="flex items-start">
        <XCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-red-500 hover:text-red-600"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  )
}