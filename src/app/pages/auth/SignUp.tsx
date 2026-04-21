import Link from 'next/link';
import { Heart, Users, Building2 } from 'lucide-react';

export function SignUp() {
  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Join Our Community</h1>
        <p className="text-white opacity-80">Choose how you'd like to make a difference</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-xl mb-6 text-center text-[#000000] font-bold">Select Your Role</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/signup/donor" className="group">
            <div className="border-2 border-[#e5e5e5] rounded-lg p-6 hover:border-[#da1a32] hover:shadow-lg transition-all cursor-pointer">
              <div className="w-16 h-16 bg-[#edf2f4] bg-opacity-30 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#da1a32] transition-all">
                <Users className="w-8 h-8 text-[#000000] group-hover:text-white" />
              </div>
              <h3 className="text-xl mb-2 text-[#000000] font-bold">Donor</h3>
              <p className="text-gray-600 text-sm">
                Contribute resources and help organizations in need
              </p>
              <div className="mt-4 text-[#000000] text-sm group-hover:text-[#da1a32] font-medium">
                Continue as Donor →
              </div>
            </div>
          </Link>

          <Link href="/receiver-verification" className="group">
            <div className="border-2 border-[#e5e5e5] rounded-lg p-6 hover:border-[#da1a32] hover:shadow-lg transition-all cursor-pointer">
              <div className="w-16 h-16 bg-[#edf2f4] bg-opacity-30 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#da1a32] transition-all">
                <Building2 className="w-8 h-8 text-[#000000] group-hover:text-white" />
              </div>
              <h3 className="text-xl mb-2 text-[#000000] font-bold">Receiver</h3>
              <p className="text-gray-600 text-sm">
                Register your organization to receive donations
              </p>
              <div className="mt-4 text-[#000000] text-sm group-hover:text-[#da1a32] font-medium">
                Continue as Receiver →
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#da1a32] hover:text-[#b01528] font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
