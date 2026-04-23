'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PaymentMethod = 'fpx' | 'tng';

export default function DonorCheckoutPage() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('fpx');

  return (
    <div className="min-h-screen bg-[#edf2f4]/40 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#000000] mb-2">🔒 Secure Checkout</h1>
          <p className="text-gray-600">Complete your sponsorship to instantly dispatch a driver.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#edf2f4] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#000000]">Order Summary</h2>
            <div className="my-4 h-px bg-[#edf2f4]" />

            <div className="space-y-3 text-[#000000]">
              <p className="text-base">📦 Item: 1x Foldable Wheelchair (Gently Used)</p>
              <p className="text-base">📍 From: Petaling Jaya</p>
              <p className="text-base">🏢 To: Grace Old Folks Home</p>
            </div>

            <div className="my-4 h-px bg-[#edf2f4]" />

            <div className="space-y-2 text-[#000000]">
              <p className="text-base">Delivery Cost: RM 22.00</p>
              <p className="text-base">Platform Fee: RM 2.20</p>
            </div>

            <div className="mt-5 rounded-xl bg-[#f8fafc] px-4 py-3">
              <p className="text-sm text-gray-500">Total Amount:</p>
              <p className="text-3xl font-bold text-[#da1a32]">RM 24.20</p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#edf2f4] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#000000] mb-4">Select Payment Method</h2>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('fpx')}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  paymentMethod === 'fpx'
                    ? 'border-[#da1a32] bg-red-50'
                    : 'border-[#edf2f4] hover:border-[#da1a32]/40'
                }`}
              >
                <p className="text-lg font-semibold text-[#000000]">🏦 FPX (Online Banking)</p>
                <p className="text-sm text-gray-600">Maybank2u, CIMB Clicks, RHB, etc.</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('tng')}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  paymentMethod === 'tng'
                    ? 'border-[#da1a32] bg-red-50'
                    : 'border-[#edf2f4] hover:border-[#da1a32]/40'
                }`}
              >
                <p className="text-lg font-semibold text-[#000000]">📱 Touch &apos;n Go eWallet</p>
                <p className="text-sm text-gray-600">Scan or pay via TNG app</p>
              </button>
            </div>

            <div className="my-5 h-px bg-[#edf2f4]" />

            <label htmlFor="receipt-email" className="mb-2 block text-sm font-medium text-[#000000]">
              Email Receipt To:
            </label>
            <input
              id="receipt-email"
              type="email"
              defaultValue="chong.user@student.um.edu.my"
              className="mb-5 w-full rounded-lg border border-[#d9d9d9] bg-[#f8fafc] px-4 py-3 text-[#000000] outline-none focus:border-[#da1a32] focus:ring-2 focus:ring-[#da1a32]/20"
            />

            <button
              type="button"
              onClick={() => router.push(`/donor/checkout/success?method=${paymentMethod}`)}
              className="w-full rounded-lg bg-[#da1a32] px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#b01528]"
            >
              Confirm &amp; Pay RM 24.20
            </button>

            <p className="mt-4 text-xs text-gray-500">
              🔒 Payments are securely processed via standard payment gateways. Your financial data is never stored on
              our servers.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
