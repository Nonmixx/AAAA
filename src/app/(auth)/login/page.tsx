'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Heart } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { resolveAuthenticatedRoute, type AppRole } from '@/lib/supabase/auth';

function loginTabMatchesProfileRole(
  tab: 'donor' | 'receiver' | 'corporate_partner',
  profileRole: string | undefined,
): boolean {
  if (!profileRole) return false;
  if (tab === 'donor') return profileRole === 'donor';
  if (tab === 'corporate_partner') return profileRole === 'corporate_partner';
  return profileRole === 'receiver' || profileRole === 'admin';
}

function profileRoleLabel(role: string | undefined): string {
  if (role === 'donor') return 'Donor';
  if (role === 'receiver') return 'Receiver';
  if (role === 'admin') return 'Admin';
  if (role === 'corporate_partner') return 'Corporate Partner';
  return role ?? 'Unknown';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<'donor' | 'receiver' | 'corporate_partner'>('donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'donor' || r === 'receiver' || r === 'corporate_partner') {
      setRole(r);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setErrorMessage('Signed in, but user session was not found.');
        return;
      }

      const { data: profileRow, error: profileReadError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileReadError) {
        setErrorMessage(profileReadError.message);
        await supabase.auth.signOut();
        return;
      }

      if (!loginTabMatchesProfileRole(role, profileRow?.role)) {
        await supabase.auth.signOut();
        setErrorMessage(
          `This email is registered as ${profileRoleLabel(profileRow?.role)}. Choose the matching login type above.`,
        );
        return;
      }

      if (role === 'corporate_partner') {
        const { data: cp, error: cpError } = await supabase
          .from('corporate_partners')
          .select('id')
          .eq('owner_profile_id', user.id)
          .maybeSingle();
        if (cpError) {
          setErrorMessage(cpError.message);
          await supabase.auth.signOut();
          return;
        }
        if (!cp) {
          await supabase.auth.signOut();
          setErrorMessage(
            'No corporate partner record for this account. Complete corporate sign-up or use another login type.',
          );
          return;
        }
      }

      const redirectTarget = searchParams.get('redirect');
      if (redirectTarget?.startsWith('/')) {
        router.replace(redirectTarget);
        return;
      }

      const preferred: AppRole =
        role === 'receiver' ? 'receiver' : role === 'corporate_partner' ? 'corporate_partner' : 'donor';
      const route = await resolveAuthenticatedRoute(preferred);
      router.replace(
        route ??
          (role === 'receiver' ? '/receiver' : role === 'corporate_partner' ? '/corporate/dashboard' : '/donor/dashboard'),
      );
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
              role === 'donor' ? 'bg-[#da1a32] text-white' : 'bg-white text-gray-500 hover:bg-[#edf2f4]'
            }`}
          >
            Donor
          </button>
          <button
            type="button"
            onClick={() => setRole('receiver')}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${
              role === 'receiver' ? 'bg-[#da1a32] text-white' : 'bg-white text-gray-500 hover:bg-[#edf2f4]'
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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#da1a32] focus:border-transparent text-[#000000]"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
          ) : null}

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
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Login'}
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
