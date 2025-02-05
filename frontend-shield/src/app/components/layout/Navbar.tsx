'use client'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Car, Shield, FileText, LayoutDashboard } from 'lucide-react'
import { usePathname } from 'next/navigation'

const Navbar = () => {
  const { isConnected } = useAccount()
  const pathname = usePathname()

  if (!isConnected) return null

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vehicles', href: '/vehicles', icon: Car },
    { name: 'Policies', href: '/policies', icon: Shield },
    { name: 'Claims', href: '/claims', icon: FileText },
  ]

  return (
    <nav className="bg-white border-r h-full">
      <div className="flex flex-col h-full p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default Navbar