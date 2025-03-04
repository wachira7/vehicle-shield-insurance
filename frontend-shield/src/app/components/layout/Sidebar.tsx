"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Car, FileText, Shield, Settings, User, LogOut, Menu, ChevronLeft, HelpCircle, Bell } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/context/AuthContext"

// Import shadcn components
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip"

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Vehicles", href: "/dashboard/vehicles", icon: Car },
  { name: "Policies", href: "/dashboard/policies", icon: Shield },
  { name: "Claims", href: "/dashboard/claims", icon: FileText },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobile, setShowMobile] = useState(false)

  // Check if screen is mobile size
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setCollapsed(true)
      }
    }
    
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) {
      setShowMobile(!showMobile)
    } else {
      setCollapsed(!collapsed)
    }
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  }

  const SidebarContent = () => (
    <>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-16 border-b border-gray-200 dark:border-gray-700 px-4`}>
        {!collapsed && (
          <span className="text-xl font-semibold text-gray-800 dark:text-white">
            VehicleShield
          </span>
        )}
        <button 
          onClick={toggleSidebar} 
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <div className="flex flex-col justify-between h-full">
        <nav className="overflow-y-auto py-6">
          <ul className={`space-y-2 px-${collapsed ? '2' : '4'}`}>
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  {collapsed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={`flex items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                              isActive
                                ? "bg-blue-100 text-blue-600 dark:bg-blue-700 dark:text-blue-200"
                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            }`}
                          >
                            <item.icon className="w-5 h-5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center p-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-700 dark:text-blue-200"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      <span>{item.name}</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
        
        <div className={`mt-auto px-${collapsed ? '2' : '4'} pb-6`}>
          {!collapsed && user && (
            <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Avatar>
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-700 dark:text-white">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {collapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/dashboard/help"
                      className="flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Help & Support
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Link
                href="/dashboard/help"
                className="flex items-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <HelpCircle className="w-5 h-5 mr-3" />
                <span>Help & Support</span>
              </Link>
            )}
            
            {collapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={logout}
                      className="flex items-center justify-center p-2 rounded-lg w-full text-red-500 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Logout
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <button
                onClick={logout}
                className="flex items-center p-2 rounded-lg w-full text-left text-red-500 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <div className="fixed top-4 left-4 z-30">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Menu size={20} />
          </button>
        </div>
      )}
      
      {/* Desktop sidebar */}
      {!isMobile && (
        <div 
          className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-20 transition-all duration-300 ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        >
          <SidebarContent />
        </div>
      )}
      
      {/* Mobile sidebar with overlay */}
      {isMobile && (
        <>
          <AnimatePresence>
            {showMobile && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black z-20"
                  onClick={toggleSidebar}
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ duration: 0.2 }}
                  className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30"
                >
                  <SidebarContent />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}