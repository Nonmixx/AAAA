// @ts-nocheck
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Building2, FileText, Upload, Phone, Mail, Lock, User } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ensureProfile, ensureSessionAfterSignUp, resolveAuthenticatedRoute } from '@/lib/supabase/auth';

export function ReceiverVerification({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [existingReceiverId, setExistingReceiverId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    organizationName: '',
    registrationNumber: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
  });

  useEffect(() => {
    const loadExistingReceiver = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        // On `/signup` (embedded), do not send a logged-in donor away before they can use this form.
        if (!embedded) {
          const route = await resolveAuthenticatedRoute();
          if (route === '/donor/dashboard') {
            router.replace(route);
            return;
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setForm((prev) => ({
          ...prev,
          fullName: prev.fullName || user.user_metadata?.full_name || '',
          email: prev.email || user.email || '',
        }));

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile || (profile.role !== 'receiver' && profile.role !== 'admin')) {
          return;
        }

        const { data: existingOrganization } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_profile_id', user.id)
          .maybeSingle();

        if (existingOrganization) {
          router.replace('/receiver');
          return;
        }

        setExistingReceiverId(user.id);
      } catch {
        // Keep page usable for fresh signup even if the session check fails.
      } finally {
        setCheckingSession(false);
      }
    };

    void loadExistingReceiver();
  }, [router, embedded]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      let receiverId = existingReceiverId;
      let profile = null;

      if (!receiverId) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.fullName,
              role: 'receiver',
            },
          },
        });

        if (signUpError) {
          setErrorMessage(signUpError.message);
          return;
        }

        await ensureSessionAfterSignUp(form.email, form.password);

        profile = await ensureProfile({
          role: 'receiver',
          fullName: form.fullName,
          phone: form.contactPhone || undefined,
        });

        receiverId = profile?.id ?? null;
      } else {
        profile = await ensureProfile({
          role: 'receiver',
          fullName: form.fullName,
          phone: form.contactPhone || undefined,
        });
        receiverId = profile?.id ?? existingReceiverId;
      }

      if (!receiverId) {
        setErrorMessage('Account created, but the receiver profile could not be initialized.');
        return;
      }

      const { error: orgError } = await supabase.from('organizations').insert({
        owner_profile_id: receiverId,
        name: form.organizationName,
        registration_number: form.registrationNumber,
        contact_email: form.contactEmail || form.email,
        contact_phone: form.contactPhone || null,
        address: form.address || null,
        verification_status: 'pending',
      });

      if (orgError) {
        setErrorMessage(orgError.message);
        return;
      }

      setSuccessMessage('Registration submitted. Your organization is pending verification.');
      if (embedded) {
        await supabase.auth.signOut();
        router.replace('/login?registered=1&role=receiver');
        return;
      }
      const route = await resolveAuthenticatedRoute('receiver');
      router.push(route ?? '/receiver');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to submit verification.');
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
            : 'w-full max-w-3xl rounded-lg bg-white px-8 py-12 text-center text-sm text-gray-500 shadow-xl'
        }
      >
        Preparing receiver signup...
      </div>
    );
  }

  const infoBanner = (
    <div
      className={`mb-6 flex items-center gap-3 p-4 bg-[#edf2f4] bg-opacity-20 rounded-lg border border-[#edf2f4] ${
        embedded ? 'mt-0' : ''
      }`}
    >
      <Building2 className="w-6 h-6 text-[#000000]" />
      <div>
        <h3 className="font-medium text-[#000000]">Receiver registration</h3>
        <p className="text-sm text-gray-600">Provide accurate details for verification (Supabase).</p>
      </div>
    </div>
  );

  const formBody = (
    <>
      {infoBanner}

      <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Admin Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  name="fullName"
                  type="text"
                  required
                  value={form.fullName}
                  onChange={onChange}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Account Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={onChange}
                  disabled={!!existingReceiverId}
                  placeholder="account@email.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {!existingReceiverId && (
            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Account Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={onChange}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Organization Name</label>
            <input
              name="organizationName"
              type="text"
              required
              value={form.organizationName}
              onChange={onChange}
              placeholder="Enter organization name"
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Registration Number</label>
            <input
              name="registrationNumber"
              type="text"
              required
              value={form.registrationNumber}
              onChange={onChange}
              placeholder="Enter registration/license number"
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  name="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={onChange}
                  placeholder="contact@organization.org"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#000000] font-medium">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  name="contactPhone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={onChange}
                  placeholder="+60 12-345 6789"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Organization Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={onChange}
              placeholder="Enter complete address"
              rows={3}
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Verification Documents (Optional for now)</label>
            <div className="border-2 border-dashed border-[#e5e5e5] rounded-lg p-8 text-center hover:border-[#da1a32] transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">Document upload is being skipped for the current signup flow</p>
              <p className="text-xs text-gray-500">We can wire storage upload back in after auth and organization creation are stable</p>
            </div>
          </div>

          <div className="bg-[#e5e5e5] rounded-lg p-4">
            <h4 className="flex items-center gap-2 text-sm mb-2 text-[#000000] font-medium">
              <FileText className="w-4 h-4 text-[#da1a32]" />
              Verification Status
            </h4>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#da1a32] text-white text-xs rounded-full font-medium">
                Pending Review
              </span>
              <span className="text-sm text-gray-600">
                Your application will be reviewed within 24-48 hours
              </span>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            {loading ? 'Submitting...' : existingReceiverId ? 'Complete Verification' : 'Submit for Verification'}
          </button>
      </form>

      {!embedded ? (
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-600 hover:text-[#000000]">
            Back to Login
          </Link>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="w-full border-t border-[#e5e5e5] pt-6 mt-2">
        <p className="text-sm text-gray-600 mb-4">
          Register your organization here. After approval, sign in from the login page to open the receiver portal.
        </p>
        {formBody}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Organization Verification</h1>
        <p className="text-white opacity-80">Complete your registration to start receiving donations</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        {formBody}
      </div>
    </div>
  );
}
