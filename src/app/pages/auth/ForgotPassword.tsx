import Link from 'next/link';
import { Mail, Heart, ArrowLeft } from 'lucide-react';

export function ForgotPassword() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Reset Password</h1>
        <p className="text-white opacity-80">Enter your email to receive reset instructions</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        <form className="space-y-6">
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            Send Reset Link
          </button>
        </form>

        <div className="mt-6">
          <Link href="/login" className="flex items-center justify-center text-sm text-gray-600 hover:text-[#000000]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
