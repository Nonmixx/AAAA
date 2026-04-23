'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const method = searchParams.get('method') === 'fpx' ? 'FPX' : "Touch 'n Go";

  return (
    <div className="min-h-screen bg-[#edf2f4]/40 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#edf2f4] bg-white p-7 shadow-xl sm:p-10">
        <section className="text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h1 className="text-4xl font-bold text-[#000000] mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Thank you! You just made a real difference today.</p>
        </section>

        <section className="mt-8 rounded-2xl bg-[#f8fafc] p-6">
          <h2 className="text-2xl font-bold text-[#000000] mb-4">Your Impact Summary</h2>

          <div className="space-y-2 text-[#000000]">
            <p>📦 Item Delivered: 1x Foldable Wheelchair</p>
            <p>📍 From: Petaling Jaya ➔ 🏢 To: Grace Old Folks Home</p>
            <p className="font-medium">Total Paid: RM 24.20 via {method}</p>
          </div>

          <div className="mt-5 rounded-xl border border-[#e5e7eb] bg-white p-4">
            <div className="mb-3 h-2 w-full rounded-full bg-[#edf2f4]">
              <div className="h-2 w-1/3 rounded-full bg-[#da1a32]" />
            </div>
            <p className="text-sm font-medium text-[#000000]">🚚 Status: Driver Dispatched! (ETA to pickup: 15 mins)</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-amber-50 p-6 border border-amber-200">
          <h2 className="text-2xl font-bold text-[#000000] mb-3">🎉 Achievement Unlocked!</h2>
          <p className="text-lg font-semibold text-[#000000] mb-2">🏅 &quot;The Transporter&quot; Badge</p>
          <p className="text-gray-700">
            Congratulations! You&apos;ve successfully funded 5 community deliveries this month. Your digital badge has
            been added to your profile.
          </p>
        </section>

        <footer className="mt-8 space-y-3">
          <Link href="/donor/profile" className="block w-full rounded-lg bg-[#da1a32] px-6 py-3 text-center text-base font-semibold text-white shadow-lg transition-all hover:bg-[#b01528]">
            View My Impact Profile
          </Link>
          <Link
            href="/donor"
            className="block w-full rounded-lg border-2 border-[#da1a32] px-6 py-3 text-center text-base font-semibold text-[#da1a32] transition-all hover:bg-red-50"
          >
            Back to Community Board
          </Link>
        </footer>
      </div>
    </div>
  );
}
