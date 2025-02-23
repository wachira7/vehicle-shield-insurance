import React from 'react';
import  Header  from '@/app/components/layout/Header';
import  Navbar  from '@/app/components/layout/Navbar';
import  Footer  from '@/app/components/layout/Footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Navbar />
        <main className="flex-1 p-6">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}