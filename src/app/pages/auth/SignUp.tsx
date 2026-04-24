import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, User, Building2, BriefcaseBusiness } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ensureProfile, ensureSessionAfterSignUp, resolveAuthenticatedRoute } from '@/lib/supabase/auth';

export function SignUp() {
  const router = useRouter();
  const [role, setRole] = useState<'donor' | 'receiver' | 'corporate'>('donor');
  const [trialAccepted, setTrialAccepted] = useState(true);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roleLabel =
    role === 'donor' ? 'Individual Donor' : role === 'receiver' ? 'Receiver (NGO/Org)' : 'Corporate Partner';

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
        // Keep signup usable if session recovery fails.
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (role === 'corporate' && !trialAccepted) {
      setErrorMessage('Please accept the trial terms to continue as Corporate Partner.');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            role,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await ensureSessionAfterSignUp(form.email, form.password);

      const profile = await ensureProfile({
        role,
        fullName: form.fullName,
        phone: form.phone || undefined,
      });

      if (!profile) {
        setErrorMessage('Account created, but the profile could not be initialized.');
        return;
      }

      if (role === 'receiver') {
        router.push('/receiver-verification');
        return;
      }

      const route = await resolveAuthenticatedRoute(role);
      router.push(route ?? (role === 'corporate' ? '/corporate/dashboard' : '/donor/dashboard'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account.';
      if (role === 'corporate' && message.toLowerCase().includes('invalid input value for enum app_role')) {
        setErrorMessage('Corporate role is not enabled in the database yet. Run supabase/add_corporate_role.sql, then try again.');
        return;
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="w-full max-w-2xl rounded-lg bg-white px-8 py-12 text-center text-sm text-gray-500 shadow-xl">
        Checking your session...
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Create Account</h1>
        <p className="text-white opacity-80">Join our ecosystem of donors, receivers, and corporate partners.</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        <p className="text-sm font-semibold text-[#000000] mb-3">I am registering as a:</p>
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole('donor')}
            className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
              role === 'donor' ? 'border-[#da1a32] bg-red-50' : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#000000]">
              <User className="w-4 h-4" /> Individual Donor
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole('receiver')}
            className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
              role === 'receiver' ? 'border-[#da1a32] bg-red-50' : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#000000]">
              <Building2 className="w-4 h-4" /> Receiver (NGO/Org)
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole('corporate')}
            className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
              role === 'corporate' ? 'border-[#da1a32] bg-red-50' : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#000000]">
              <BriefcaseBusiness className="w-4 h-4" /> Corporate Partner
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              Full Name / Company Name
              <input
                name="fullName"
                required
                value={form.fullName}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder={role === 'corporate' ? 'Apex Manufacturing Berhad' : 'Your full name'}
              />
            </label>
            <label className="text-sm text-gray-700">
              Email Address
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder="you@example.com"
              />
            </label>
            <label className="text-sm text-gray-700">
              Phone Number
              <input
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder="+60 1X-XXX XXXX"
              />
            </label>
            <label className="text-sm text-gray-700">
              Password
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder="••••••••"
              />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              Confirm Password
              <input
                name="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder="••••••••"
              />
            </label>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {role === 'corporate' ? (
            <div className="pt-4 border-t border-[#e5e5e5]">
              <h3 className="text-sm font-semibold text-[#000000]">⭐ ESG Impact Hub Subscription</h3>
              <p className="text-xs text-gray-600 mt-1">
                Automate your corporate logistics and generate quarterly sustainability reports.
              </p>
              <div className="mt-3 rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/30 p-3">
                <p className="text-sm font-semibold text-[#000000]">Premium Tier: RM 150.00 / month</p>
                <ul className="mt-2 space-y-1 text-xs text-gray-700">
                  <li>✔️ 1-Click Automated ESG Impact Reports</li>
                  <li>✔️ Full access to the Logistics Sponsorship Wallet</li>
                  <li>✔️ Advanced SDG Target Alignment</li>
                  <li>✔️ Downloadable Tax-Deductible Receipts</li>
                </ul>
              </div>
              <label className="mt-3 inline-flex items-start gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={trialAccepted}
                  onChange={(e) => setTrialAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Start my 14-day free trial. I understand I will be billed RM 150/month after the trial ends.
                </span>
              </label>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            {loading
              ? 'Creating account...'
              : role === 'receiver'
                ? 'Create Account & Continue'
                : role === 'corporate'
                  ? 'Create Account & Start Trial'
                  : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#da1a32] hover:text-[#b01528] font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>

      <div className="text-center mt-2">
        <p className="text-xs text-white opacity-80">Registration role: {roleLabel}</p>
      </div>
    </div>
  );
}
