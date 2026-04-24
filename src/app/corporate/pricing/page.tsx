'use client';

import Link from 'next/link';
import { CheckCircle2, Star } from 'lucide-react';

const PREMIUM_FEATURES = [
  'Everything in Basic, plus:',
  '1-Click Automated ESG Impact Reports (Quarterly & Annual)',
  'Full access to the Logistics Sponsorship Wallet',
  'Advanced SDG Target Alignment (Select & track up to 3 SDGs)',
  'Downloadable Tax-Deductible Receipts',
  'Priority AI Handoffs to high-impact NGOs',
];

export default function CorporatePricingPage() {
  return (
    <div className="min-h-screen bg-[#edf2f4]/40 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Link href="/donor">
            <button className="px-6 py-3 bg-white text-[#000000] border border-[#dbe2e8] rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm">
              Back
            </button>
          </Link>
        </div>

        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#000000]">Simple, Transparent Pricing for Maximum Impact.</h1>
          <p className="text-gray-600 mt-3 text-lg">
            Transform your surplus assets into measurable community impact and automated ESG reporting. No hidden fees.
          </p>
        </header>

        <section className="max-w-2xl mx-auto">
          <article className="bg-white rounded-2xl border-2 border-[#da1a32] shadow-sm p-6 relative">
            <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[#da1a32] text-white text-xs font-semibold px-2.5 py-1">
              <Star className="w-3.5 h-3.5" /> RECOMMENDED FOR ENTERPRISE
            </span>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">The ESG Impact Hub (Premium)</p>
            <p className="text-sm text-gray-600 mt-1">Companies needing CSR data, reporting, and sustained impact.</p>
            <p className="mt-5 text-4xl font-bold text-[#000000]">RM 150<span className="text-base font-medium text-gray-500"> / month</span></p>
            <div className="mt-5 space-y-2.5">
              {PREMIUM_FEATURES.map((feature) => (
                <p key={feature} className="text-sm inline-flex items-start gap-2 text-gray-700">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                  <span>{feature}</span>
                </p>
              ))}
            </div>
            <Link href="/login">
              <button className="mt-6 w-full bg-[#da1a32] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#b01528] transition-all">
                Start 14-Day Free Trial
              </button>
            </Link>
          </article>
        </section>

        <section className="mt-8 bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-6">
          <h2 className="text-2xl font-bold text-[#000000]">Why Upgrade to the ESG Impact Hub?</h2>
          <div className="mt-4 space-y-2 text-gray-700">
            <p><strong>Save Time:</strong> Stop manually calculating carbon offsets. Our system generates ready-to-publish ESG PDFs instantly.</p>
            <p><strong>Boost Employee Morale:</strong> Showcase transparent, verifiable community impact.</p>
            <p><strong>Tax Compliance:</strong> Easily export organized ledgers for corporate tax deduction filing in Malaysia.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
