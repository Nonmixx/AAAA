import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ensureProfile, ensureSessionAfterSignUp, resolveAuthenticatedRoute } from '@/lib/supabase/auth';

type CorporateInsertPayload = Record<string, unknown>;

function looksLikeColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('column') || m.includes('does not exist') || m.includes('schema cache');
}

async function upsertCorporatePartner(
  ownerProfileId: string,
  form: {
    companyName: string;
    contactEmail: string;
    contactPhone: string;
  },
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const payloadCandidates: CorporateInsertPayload[] = [
    {
      owner_profile_id: ownerProfileId,
      legal_name: form.companyName,
      contact_email: form.contactEmail,
      contact_phone: form.contactPhone || null,
      verification_status: 'pending',
    },
    {
      owner_profile_id: ownerProfileId,
      legal_name: form.companyName,
      contact_phone: form.contactPhone || null,
    },
  ];

  let lastError = '';
  for (const payload of payloadCandidates) {
    const { error } = await supabase.from('corporate_partners').upsert(payload, { onConflict: 'owner_profile_id' });
    if (!error) return { error: null };
    lastError = error.message;
    if (!looksLikeColumnError(error.message)) break;
  }
  return { error: lastError || 'Unable to create corporate partner record.' };
}

export function CorporateSignUp({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [trialAgreed, setTrialAgreed] = useState(true);
  const [form, setForm] = useState({
    fullNameOrCompany: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
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
        // keep signup available
      } finally {
        if (isMounted) setCheckingSession(false);
      }
    };
    void check();
    return () => {
      isMounted = false;
    };
  }, [embedded, router]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (form.password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!trialAgreed) {
      setErrorMessage('Please agree to start the trial before creating account.');
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullNameOrCompany,
            role: 'corporate_partner',
          },
        },
      });

      const signUpMessage = signUpError?.message?.toLowerCase() ?? '';
      const alreadyRegistered =
        signUpMessage.includes('already registered') ||
        signUpMessage.includes('user already exists') ||
        signUpMessage.includes('already been registered');

      if (signUpError && !alreadyRegistered) {
        setErrorMessage(signUpError.message);
        return;
      }

      let signedUser = signUpData?.user ?? null;
      if (alreadyRegistered) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInError) {
          setErrorMessage(
            'This email already exists. Please use the correct password to continue setup, or use Forgot Password.',
          );
          return;
        }
        signedUser = signInData.user;
      } else {
        signedUser = await ensureSessionAfterSignUp(form.email, form.password);
      }

      const profile = await ensureProfile({
        role: 'corporate_partner',
        fullName: form.fullNameOrCompany,
        phone: form.phone || undefined,
      });

      const ownerId = profile?.id ?? signedUser?.id ?? null;
      if (!ownerId) {
        setErrorMessage('Account created, but profile setup did not complete.');
        return;
      }

      const { error } = await upsertCorporatePartner(ownerId, {
        companyName: form.fullNameOrCompany,
        contactEmail: form.email,
        contactPhone: form.phone,
      });
      if (error) {
        setErrorMessage(error);
        return;
      }

      await supabase.auth.signOut();
      router.replace('/login?registered=1&role=corporate_partner');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to create corporate account.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="py-8 text-center text-sm text-gray-500">Preparing corporate signup...</div>;
  }

  return (
    <div className={embedded ? 'w-full border-t border-[#e5e5e5] pt-6 mt-2' : 'w-full max-w-3xl'}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Full Name / Company Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                name="fullNameOrCompany"
                required
                value={form.fullNameOrCompany}
                onChange={onChange}
                placeholder="Apex Manufacturing Berhad"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={onChange}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                name="phone"
                value={form.phone}
                onChange={onChange}
                placeholder="+60 1X-XXX XXXX"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                name="password"
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={onChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2 text-[#000000] font-medium">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg"
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
          <p className="text-sm font-semibold text-[#000000]">🌟 ESG Impact Hub Subscription</p>
          <p className="text-xs text-gray-500 mt-1">
            Automate your corporate logistics and generate quarterly sustainability reports.
          </p>
          <div className="mt-3 rounded-lg border border-[#e5e5e5] bg-white p-3">
            <p className="text-sm font-semibold text-[#000000]">Premium Tier: RM 150.00 / month</p>
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li>✔ 1-Click Automated ESG Impact Reports</li>
              <li>✔ Full access to the Logistics Sponsorship Wallet</li>
              <li>✔ Advanced SDG Target Alignment</li>
              <li>✔ Downloadable Tax-Deductible Receipts</li>
            </ul>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={trialAgreed}
            onChange={(e) => setTrialAgreed(e.target.checked)}
            className="mt-0.5 accent-[#da1a32]"
          />
          Start my 14-day free trial. I understand I will be billed RM 150/month after the trial ends.
        </label>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !trialAgreed}
          className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account & Start Trial'}
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#da1a32] hover:text-[#b01528] font-medium">
              Login
            </Link>
          </p>
          <p className="text-xs text-gray-400 mt-2">Registration role: Corporate Partner</p>
        </div>
      </form>
    </div>
  );
}
