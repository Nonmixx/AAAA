'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col">
      {/* Same public nav header */}
      <nav className="bg-[#000000] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/donor" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-[#da1a32] rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                <Heart className="w-7 h-7 text-white" fill="white" />
              </div>
              <div className="text-2xl font-bold text-white">DonateAI</div>
            </Link>

            {/* Login Button */}
            <div className="flex items-center gap-4">
              <Link href="/login">
                <button className="px-6 py-2 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg">
                  Login
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        {children}
      </div>
    </div>
  );
}