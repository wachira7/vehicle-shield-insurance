// src/components/authentication/PasswordStrengthIndicator.tsx
import { MdCheck } from 'react-icons/md';
import { motion } from 'framer-motion'

interface PasswordStrengthProps {
    password: string;
    validations: {
      minLength: boolean;
      hasUpperCase: boolean;
      hasLowerCase: boolean;
      hasNumber: boolean;
      hasSpecialChar: boolean;
    };
  }

  const getValidations = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
    };
  };
  
  export const PasswordStrengthIndicator = ({ password}: PasswordStrengthProps) => {
    const validations = getValidations(password);
    const getStrengthPercentage = () => {
      const validCount = Object.values(validations).filter(Boolean).length;
      return (validCount / 5) * 100;
    }
  
    const getStrengthColor = () => {
      const percentage = getStrengthPercentage();
      if (percentage <= 20) return 'Very Weak';
      if (percentage <= 40) return 'Weak';
      if (percentage <= 60) return 'Medium';
      if (percentage <= 80) return 'Strong';
      return 'Very Strong';
    }
  
    return (
        <div className="space-y-2">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getStrengthColor()}`}
              style={{ width: `${getStrengthPercentage()}%` }}
            />
          </div>
          <div className="space-y-1 text-sm">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: validations.minLength ? 1 : 0 }}
              className={`flex items-center ${validations.minLength ? 'text-green-600' : 'text-gray-500'}`}
            >
              <MdCheck className={`w-4 h-4 mr-2 ${validations.minLength ? 'opacity-100' : 'opacity-0'}`} />
              At least 8 characters
            </motion.div>
      
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: validations.hasUpperCase ? 1 : 0 }}
              className={`flex items-center ${validations.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}
            >
              <MdCheck className={`w-4 h-4 mr-2 ${validations.hasUpperCase ? 'opacity-100' : 'opacity-0'}`} />
              One uppercase letter
            </motion.div>
      
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: validations.hasLowerCase ? 1 : 0 }}
              className={`flex items-center ${validations.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}
            >
              <MdCheck className={`w-4 h-4 mr-2 ${validations.hasLowerCase ? 'opacity-100' : 'opacity-0'}`} />
              One lowercase letter
            </motion.div>
      
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: validations.hasNumber ? 1 : 0 }}
              className={`flex items-center ${validations.hasNumber ? 'text-green-600' : 'text-gray-500'}`}
            >
              <MdCheck className={`w-4 h-4 mr-2 ${validations.hasNumber ? 'opacity-100' : 'opacity-0'}`} />
              One number
            </motion.div>
      
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: validations.hasSpecialChar ? 1 : 0 }}
              className={`flex items-center ${validations.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}
            >
              <MdCheck className={`w-4 h-4 mr-2 ${validations.hasSpecialChar ? 'opacity-100' : 'opacity-0'}`} />
              One special character
            </motion.div>
          </div>
        </div>
      )
  }