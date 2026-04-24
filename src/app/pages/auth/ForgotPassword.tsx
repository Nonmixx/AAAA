'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Heart, ArrowLeft } from 'lucide-react';

export function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { expiresAt?: string; error?: string };
      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Unable to send verification code.');
        return;
      }

      const params = new URLSearchParams({
        email,
        expiresAt: payload.expiresAt ?? new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      });
      router.push(`/forgot-password/verify?${params.toString()}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Reset Password</h1>
        <p className="text-white opacity-80">Enter your email to receive a 4-digit verification code</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg"
          >
            {loading ? 'Sending code...' : 'Send Verification Code'}
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
