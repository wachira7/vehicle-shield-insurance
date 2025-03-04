//src/app/components/layout/Navbar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccount, useDisconnect } from 'wagmi';
import { Car, Shield, FileText, LayoutDashboard, Menu, X, LogOut, Settings, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Navbar = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isConnected || !user) return null;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vehicles', href: '/dashboard/vehicles', icon: Car },
    { name: 'Policies', href: '/dashboard/policies', icon: Shield },
    { name: 'Claims', href: '/dashboard/claims', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleDisconnect = () => {
    disconnect();
    // Additional logout logic can go here if needed
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="bg-white shadow-md"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar navigation */}
      <nav className={`
        fixed lg:sticky top-0 left-0 z-40
        h-screen lg:h-[calc(100vh-0px)]
        w-64 bg-white border-r shadow-sm
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-4">
          {/* Logo/Brand */}
          <div className="mb-6 py-4 flex items-center justify-center border-b">
            <Shield className="h-6 w-6 text-blue-600 mr-2" />
            <span className="text-xl font-bold">VehicleShield</span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Footer with user info and logout */}
          <div className="mt-auto pt-4 border-t">
            <Button 
              variant="outline"
              className="w-full flex items-center justify-start text-gray-600 hover:text-red-600 hover:border-red-200 mb-4"
              onClick={handleDisconnect}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Disconnect Wallet
            </Button>
            
            {address && (
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Connected Wallet</div>
                <div className="font-mono text-sm text-gray-700 truncate">
                  {`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}
                </div>
              </div>
            )}

            {user && user.email && (
              <div className="mt-2 px-4 py-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Logged in as</div>
                <div className="text-sm text-gray-700 truncate">
                  {user.email}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Navbar;