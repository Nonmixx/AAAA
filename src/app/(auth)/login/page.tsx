'use client';
// @ts-nocheck

import type React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { resolveAuthenticatedRoute } from '@/lib/supabase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'donor' | 'receiver'>('donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const redirectAuthenticatedUser = async () => {
      try {
        const route = await resolveAuthenticatedRoute();
        if (route && isMounted) {
          router.replace(route);
          return;
        }
      } catch {
        // Keep the login screen usable if session recovery fails.
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    void redirectAuthenticatedUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const route = await resolveAuthenticatedRoute(role);
      if (route) {
        router.push(route);
        return;
      }

      setErrorMessage('Login succeeded, but no active session could be resolved.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to login.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="w-full max-w-md rounded-lg bg-white px-8 py-12 text-center text-sm text-gray-500 shadow-xl">
        Checking your session...
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg text-white text-3xl font-bold">
          D
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Welcome Back</h1>
        <p className="text-white opacity-80">Login to continue making a difference</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
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
            I&apos;m a Donor
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
            I&apos;m a Receiver
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#da1a32] focus:border-transparent text-[#000000]"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#da1a32] focus:border-transparent text-[#000000]"
                placeholder="••••••••"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

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
            disabled={loading}
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Don&apos;t have an account? </span>
          <Link href="/signup" className="text-[#da1a32] hover:text-[#b01528] font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
