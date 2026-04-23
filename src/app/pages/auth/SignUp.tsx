import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, User, Building2, BriefcaseBusiness, CheckCircle2 } from 'lucide-react';

export function SignUp() {
  const router = useRouter();
  const [role, setRole] = useState<'donor' | 'receiver' | 'corporate_partner'>('donor');
  const [trialAccepted, setTrialAccepted] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const roleLabel =
    role === 'donor' ? 'Individual Donor' : role === 'receiver' ? 'Receiver (NGO/Org)' : 'Corporate Partner';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'corporate_partner' && !trialAccepted) {
      window.alert('Please accept the trial terms to continue as Corporate Partner.');
      return;
    }
    setShowSuccess(true);
  };

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
            onClick={() => setRole('corporate_partner')}
            className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
              role === 'corporate_partner' ? 'border-[#da1a32] bg-red-50' : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
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
                required
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder={role === 'corporate_partner' ? 'Apex Manufacturing Berhad' : 'Your full name'}
              />
            </label>
            <label className="text-sm text-gray-700">
              Email Address
              <input
                type="email"
                required
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder="you@example.com"
              />
            </label>
            <label className="text-sm text-gray-700">
              Phone Number
              <input
                required
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder="+60 1X-XXX XXXX"
              />
            </label>
            <label className="text-sm text-gray-700">
              Password
              <input
                type="password"
                required
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder="••••••••"
              />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              Confirm Password
              <input
                type="password"
                required
                className="mt-1.5 w-full rounded-lg border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                placeholder="••••••••"
              />
            </label>
          </div>

          {role === 'corporate_partner' ? (
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
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            {role === 'corporate_partner' ? 'Create Account & Start Trial' : 'Create Account'}
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

      {showSuccess ? (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-2xl p-6 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-[#000000]">Account Created Successfully!</h3>
            <p className="text-sm text-gray-600 mt-2">
              Welcome to DonateAI. Your secure environment is ready.
            </p>
            <button
              onClick={() => router.push(`/login?registered=1&role=${role}`)}
              className="mt-5 w-full bg-[#da1a32] text-white py-2.5 rounded-lg hover:bg-[#b01528] transition-all font-medium"
            >
              Proceed to Login ➔
            </button>
            <p className="text-xs text-gray-500 mt-2">Registration role: {roleLabel}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
