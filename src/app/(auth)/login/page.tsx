'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Heart } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<'donor' | 'receiver' | 'corporate_partner'>('donor');
  const showRegisteredBanner = searchParams.get('registered') === '1';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const redirectTarget = searchParams.get('redirect');
    if (redirectTarget?.startsWith('/')) {
      return router.push(redirectTarget);
    }

    if (role === 'donor') return router.push('/donor/dashboard');
    if (role === 'receiver') return router.push('/receiver');
    return router.push('/corporate/dashboard');
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Welcome Back</h1>
        <p className="text-white opacity-80">Login to continue making a difference</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        {showRegisteredBanner ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
            🟢 Registration successful! Please log in with your new credentials.
          </div>
        ) : null}
        {/* Role Toggle */}
        <div className="flex rounded-lg border-2 border-[#e5e5e5] overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => setRole('donor')}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${
              role === 'donor'
                ? 'bg-[#da1a32] text-white'
                : 'bg-white text-gray-500 hover:bg-[#edf2f4]'
            }`}
          >
            Donor
          </button>
          <button
            type="button"
            onClick={() => setRole('receiver')}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${
              role === 'receiver'
                ? 'bg-[#da1a32] text-white'
                : 'bg-white text-gray-500 hover:bg-[#edf2f4]'
            }`}
          >
            Receiver
          </button>
          <button
            type="button"
            onClick={() => setRole('corporate_partner')}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${
              role === 'corporate_partner'
                ? 'bg-[#da1a32] text-white'
                : 'bg-white text-gray-500 hover:bg-[#edf2f4]'
            }`}
          >
            Corporate Partner
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                required
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#da1a32] focus:border-transparent text-[#000000]"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                required
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#da1a32] focus:border-transparent text-[#000000]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#da1a32]" />
              <span className="text-gray-600">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-[#da1a32] hover:text-[#b01528] font-medium">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Don't have an account? </span>
          <Link href="/signup" className="text-[#da1a32] hover:text-[#b01528] font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
