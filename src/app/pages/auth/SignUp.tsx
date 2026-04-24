import { useState } from 'react';
import Link from 'next/link';
import { Heart, User, Building2, BriefcaseBusiness } from 'lucide-react';
import { DonorSignUp } from './DonorSignUp';
import { ReceiverVerification } from './ReceiverVerification';
import { CorporateSignUp } from './CorporateSignUp';

export function SignUp() {
  const [role, setRole] = useState<'donor' | 'receiver' | 'corporate_partner'>('donor');

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

        {role === 'donor' ? (
          <DonorSignUp embedded />
        ) : role === 'receiver' ? (
          <ReceiverVerification embedded />
        ) : (
          <CorporateSignUp embedded />
        )}

        {role !== 'corporate_partner' ? (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-[#da1a32] hover:text-[#b01528] font-medium">
                Login
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
