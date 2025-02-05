'use client'
import { useState, useEffect } from 'react'
import { ConnectButton } from "../Wallet/ConnectButton"
import Image from "next/image"
import Link from "next/link"
import { Menu, X, Car, Shield, FileText } from 'lucide-react'
import { useAccount } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'


interface NavItemWithIcon {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface NavItemWithoutIcon {
  name: string;
  href: string;
}

type NavItem = NavItemWithIcon | NavItemWithoutIcon;
const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isConnected } = useAccount()

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])
  

  const navigation: NavItem[] = isConnected ? [
    { name: 'Dashboard', href: '/dashboard', icon: <Shield className="w-5 h-5" /> },
    { name: 'My Vehicles', href: '/vehicles', icon: <Car className="w-5 h-5" /> },
    { name: 'Policies', href: '/policies', icon: <Shield className="w-5 h-5" /> },
    { name: 'Claims', href: '/claims', icon: <FileText className="w-5 h-5" /> },
  ] : [
    { name: 'Features', href: '/#features' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'FAQ', href: '/#faq' },
  ]

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image src="/logo.svg" alt="VehicleShield" width={32} height={32} className="h-8 w-auto" />
              <span className="ml-2 text-xl font-bold text-gray-900">VehicleShield</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
              key={item.name}
              href={item.href}
              className="flex items-center text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              {('icon' in item) && <span className="mr-2">{item.icon}</span>}
              {item.name}
            </Link>
            ))}
            <ConnectButton className="ml-4" />
          </div>

          {/* Mobile menu button */}
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isMobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90 }}
                  animate={{ rotate: 0 }}
                  exit={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90 }}
                  animate={{ rotate: 0 }}
                  exit={{ rotate: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden"
            >
              <div className="pt-2 pb-3 space-y-1">
                {navigation.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {('icon' in item) && <span className="mr-2">{item.icon}</span>}
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </div>
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="pt-4 pb-3 border-t border-gray-200"
              >
                <div className="px-3">
                  <ConnectButton className="w-full" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}

export default Header