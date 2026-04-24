'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

export function DonorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-[#000000] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <Link href="/donor" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-[#da1a32] rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                <Heart className="w-7 h-7 text-white" fill="white" />
              </div>
              <div className="text-2xl font-bold">DonateAI</div>
            </Link>

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

      <main>{children}</main>

      <footer className="bg-[#000000] text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#da1a32] rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" fill="white" />
                </div>
                <div className="text-xl font-bold">DonateAI</div>
              </div>
              <p className="text-white opacity-70 text-sm">
                AI-powered platform connecting donors with organizations in need.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-white opacity-70">
                <li><Link href="/" className="hover:text-[#da1a32]">Home</Link></li>
                <li><Link href="/needs" className="hover:text-[#da1a32]">View Needs</Link></li>
                <li><Link href="/donor/donate" className="hover:text-[#da1a32]">Donate</Link></li>
                <li><Link href="/donor/tracking" className="hover:text-[#da1a32]">Track Donations</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-white opacity-70">
                <li><a href="#" className="hover:text-[#da1a32]">Help Center</a></li>
                <li><a href="#" className="hover:text-[#da1a32]">Contact Us</a></li>
                <li><a href="#" className="hover:text-[#da1a32]">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-white opacity-70">
                <li><a href="#" className="hover:text-[#da1a32]">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#da1a32]">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-white opacity-60">
            © 2026 DonateAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
