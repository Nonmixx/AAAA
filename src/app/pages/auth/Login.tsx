import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Heart } from 'lucide-react';
import { resolveAuthenticatedRoute } from '@/lib/supabase/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<'donor' | 'receiver' | 'corporate'>('donor');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const showRegisteredBanner = searchParams.get('registered') === '1';

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
        // Keep login usable if session recovery fails.
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
    setErrorMessage(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const redirectTarget = searchParams.get('redirect');
      if (redirectTarget?.startsWith('/')) {
        router.push(redirectTarget);
        return;
      }

      const route = await resolveAuthenticatedRoute(role);
      router.push(route ?? (role === 'corporate' ? '/corporate/dashboard' : '/donor/dashboard'));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to sign in.');
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
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Welcome Back</h1>
        <p className="text-white opacity-80">Login to continue making a difference</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        {showRegisteredBanner ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
            Registration successful! Please log in with your new credentials.
          </div>
        ) : null}

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
            onClick={() => setRole('corporate')}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${
              role === 'corporate'
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
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
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
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-[#000000] hover:text-[#da1a32]">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : `Login as ${role === 'donor' ? 'Donor' : role === 'receiver' ? 'Receiver' : 'Corporate Partner'}`}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#da1a32] hover:text-[#b01528] font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
