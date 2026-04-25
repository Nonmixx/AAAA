'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Heart, Mail } from 'lucide-react';

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function VerifyResetCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const expiresAtParam = searchParams.get('expiresAt');
  const initialExpiry = useMemo(() => {
    const parsed = expiresAtParam ? new Date(expiresAtParam).getTime() : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now() + 2 * 60 * 1000;
  }, [expiresAtParam]);

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [expiryTs, setExpiryTs] = useState(initialExpiry);
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.ceil((initialExpiry - Date.now()) / 1000)));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((expiryTs - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiryTs]);

  const expired = secondsLeft <= 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    if (expired) {
      setErrorMessage('Code expired. Please request a new one.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Unable to reset password.');
        return;
      }

      setMessage('Password reset successful. Redirecting to login...');
      window.setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setErrorMessage(null);
    setMessage(null);
    setResending(true);
    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { expiresAt?: string; error?: string };
      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Unable to resend code.');
        return;
      }
      const newExpiry = payload.expiresAt ? new Date(payload.expiresAt).getTime() : Date.now() + 2 * 60 * 1000;
      setExpiryTs(newExpiry);
      setSecondsLeft(Math.max(0, Math.ceil((newExpiry - Date.now()) / 1000)));
      setMessage('A new 4-digit code was sent to your email.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#da1a32] rounded-lg mb-4 shadow-lg">
          <Heart className="w-8 h-8 text-white" fill="white" />
        </div>
        <h1 className="text-3xl mb-2 text-white font-bold">Verify Code</h1>
        <p className="text-white opacity-80">Enter the 4-digit code and set your new password</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-8">
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              placeholder="1234"
            />
            <p className={`mt-2 text-sm ${expired ? 'text-red-600' : 'text-gray-600'}`}>
              Time left: {formatSeconds(secondsLeft)}
            </p>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[#000000] font-medium">New Password</label>
            <input
              type="password"
              minLength={6}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
              placeholder="Enter new password"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
          ) : null}
          {message ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || expired}
            className="w-full bg-[#da1a32] text-white py-3 rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Resetting password...' : 'Verify Code & Reset Password'}
          </button>
        </form>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleResendCode()}
            disabled={resending}
            className="w-full border border-[#da1a32] text-[#da1a32] py-2.5 rounded-lg hover:bg-[#fff1f3] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? 'Sending new code...' : 'Resend Code'}
          </button>
        </div>

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
