import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Heart } from 'lucide-react';

export function Login() {
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-[#000000] hover:text-[#da1a32]">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            Login as {role === 'donor' ? 'Donor' : role === 'receiver' ? 'Receiver' : 'Corporate Partner'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#da1a32] hover:text-[#b01528] font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
