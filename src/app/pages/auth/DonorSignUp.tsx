import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ensureProfile, ensureSessionAfterSignUp, resolveAuthenticatedRoute } from '@/lib/supabase/auth';

export function DonorSignUp({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const redirectAuthenticatedUser = async () => {
      // On `/signup` (embedded), never skip straight to the donor app: user must sign up (or use another
      // account) and sign in via `/login` first. A leftover session would otherwise `replace` to dashboard.
      if (embedded) {
        if (isMounted) setCheckingSession(false);
        return;
      }

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
  }, [router, embedded]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Passwords do not match.');
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
            role: 'donor',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await ensureSessionAfterSignUp(form.email, form.password);

      const profile = await ensureProfile({
        role: 'donor',
        fullName: form.fullName,
        phone: form.phone || undefined,
      });

      if (!profile) {
        setErrorMessage('Account created, but the profile could not be initialized.');
        return;
      }

      // Profile is created while signed in; then sign out so the user logs in explicitly on /login.
      await supabase.auth.signOut();
      router.replace('/login?registered=1&role=donor');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div
        className={
          embedded
            ? 'py-8 text-center text-sm text-gray-500'
            : 'w-full max-w-md rounded-lg bg-white px-8 py-12 text-center text-sm text-gray-500 shadow-xl'
        }
      >
        Checking your session...
      </div>
    );
  }

  const formBody = (
    <>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+60 12-345 6789"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                className="w-full pl-10 pr-10 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {/* Strength bar */}
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= passwordStrength ? strengthColor : 'bg-[#e5e5e5]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">Strength: <span className="font-medium">{strengthLabel}</span></p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                className={`w-full pl-10 pr-10 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent ${
                  form.confirmPassword && form.password !== form.confirmPassword
                    ? 'border-[#da1a32]'
                    : 'border-[#e5e5e5]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-[#da1a32] mt-1">Passwords do not match</p>
            )}
            {form.confirmPassword && form.password === form.confirmPassword && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Passwords match
              </p>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 accent-[#da1a32] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="agree" className="text-sm text-gray-600 cursor-pointer">
              I agree to the{' '}
              <span className="text-[#da1a32] hover:text-[#b01528] font-medium cursor-pointer">Terms of Service</span>{' '}
              and{' '}
              <span className="text-[#da1a32] hover:text-[#b01528] font-medium cursor-pointer">Privacy Policy</span>
            </label>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !agreed || (!!form.confirmPassword && form.password !== form.confirmPassword)}
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {!embedded ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-[#da1a32] hover:text-[#b01528] font-medium">
                Login
              </Link>
            </p>
          </div>
        ) : null}

        {!embedded ? (
          <div className="mt-3 text-center">
            <Link href="/signup" className="text-sm text-gray-400 hover:text-gray-600">
              ← Back to role selection
            </Link>
          </div>
        ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="w-full border-t border-[#e5e5e5] pt-6 mt-2">
        <p className="text-sm text-gray-600 mb-4">
          Complete your donor account below. You will be redirected to login after registration.
        </p>
        {formBody}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Create Donor Account</h1>
        <p className="text-white opacity-80">Join thousands making a difference every day</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">{formBody}</div>
    </div>
  );
}
