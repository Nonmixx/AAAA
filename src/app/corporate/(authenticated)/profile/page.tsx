'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Wallet, Save, Upload, CreditCard, Target } from 'lucide-react';
import { getCorporateMemory, saveCorporateMemory } from '../../../lib/corporate-ai-engine';

type ProfileTab = 'details' | 'wallet';

const SDG_OPTIONS = [
  { id: 'sdg1', label: 'SDG 1: No Poverty' },
  { id: 'sdg2', label: 'SDG 2: Zero Hunger' },
  { id: 'sdg4', label: 'SDG 4: Quality Education' },
  { id: 'sdg10', label: 'SDG 10: Reduced Inequalities' },
  { id: 'sdg12', label: 'SDG 12: Responsible Consumption' },
  { id: 'sdg13', label: 'SDG 13: Climate Action' },
];

export default function CorporateProfilePage() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ledgerRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<ProfileTab>('details');
  const [companyName, setCompanyName] = useState('Apex Manufacturing Berhad');
  const [industry, setIndustry] = useState('Manufacturing & Consumer Goods');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedSdgs, setSelectedSdgs] = useState<string[]>(['sdg4', 'sdg12']);
  const [walletBalance, setWalletBalance] = useState('5000.00');
  const [autoTopUp, setAutoTopUp] = useState(true);
  const [walletActivated, setWalletActivated] = useState(false);
  const [primaryFocus, setPrimaryFocus] = useState('sdg4');
  const [secondaryFocus, setSecondaryFocus] = useState('sdg1');
  const [saveNote, setSaveNote] = useState('');

  const toggleSdg = (id: string) => {
    setSelectedSdgs((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  useEffect(() => {
    const memory = getCorporateMemory();
    setSelectedSdgs(memory.targetSdgs);
    const saved = window.localStorage.getItem('corporate_profile_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          companyName?: string;
          industry?: string;
          logoPreview?: string | null;
          walletActivated?: boolean;
          autoTopUp?: boolean;
          primaryFocus?: string;
          secondaryFocus?: string;
        };
        setCompanyName(parsed.companyName ?? 'Apex Manufacturing Berhad');
        setIndustry(parsed.industry ?? 'Manufacturing & Consumer Goods');
        setLogoPreview(parsed.logoPreview ?? null);
        setWalletActivated(Boolean(parsed.walletActivated));
        setAutoTopUp(parsed.autoTopUp ?? true);
        setPrimaryFocus(parsed.primaryFocus ?? 'sdg4');
        setSecondaryFocus(parsed.secondaryFocus ?? 'sdg1');
      } catch {
        // no-op
      }
    }
    if (searchParams.get('tab') === 'wallet') setTab('wallet');
  }, []);

  useEffect(() => {
    const parsedWallet = Number(walletBalance.replace(/[^0-9.]/g, ''));
    saveCorporateMemory({
      targetSdgs: selectedSdgs,
      logisticsWalletBalance: Number.isFinite(parsedWallet) ? parsedWallet : 0,
    });
  }, [selectedSdgs, walletBalance]);

  const uploadLogo = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const topUpBalance = () => {
    const raw = window.prompt('Enter top-up amount (RM):', '1000');
    if (!raw) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const current = Number(walletBalance) || 0;
    const next = (current + amount).toFixed(2);
    setWalletBalance(next);
    setSaveNote(`Wallet topped up by RM ${amount.toFixed(2)}.`);
  };

  const savePreferences = () => {
    if (!walletActivated) return;
    const merged = Array.from(new Set([primaryFocus, secondaryFocus].filter(Boolean)));
    setSelectedSdgs(merged);
    setSaveNote('Corporate ESG target preferences saved.');
  };

  const saveProfile = () => {
    window.localStorage.setItem(
      'corporate_profile_v1',
      JSON.stringify({
        companyName,
        industry,
        logoPreview,
        walletActivated,
        autoTopUp,
        primaryFocus,
        secondaryFocus,
      }),
    );
    setSaveNote('Corporate profile saved.');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid lg:grid-cols-[240px,1fr] gap-5">
        <aside className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-3 h-fit">
          <button
            onClick={() => setTab('details')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === 'details' ? 'bg-[#da1a32] text-white' : 'text-[#000000] hover:bg-[#edf2f4]'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Corporate Details & Brand
            </span>
          </button>
          <button
            onClick={() => setTab('wallet')}
            className={`w-full mt-2 text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === 'wallet' ? 'bg-[#da1a32] text-white' : 'text-[#000000] hover:bg-[#edf2f4]'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Logistics Wallet
            </span>
          </button>
        </aside>

        <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-6">
          {tab === 'details' ? (
            <div>
              <h1 className="text-xl font-bold text-[#000000]">Corporate Details & Brand</h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure profile and ESG identity. These settings improve reporting and AI partner matching.
              </p>

              <div className="mt-5 grid md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-700">
                  Company Name
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                  />
                </label>
                <label className="text-sm text-gray-700">
                  Industry
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                  />
                </label>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-700 mb-1.5">Company Logo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadLogo(e.target.files?.[0])}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] hover:bg-[#edf2f4] transition-all text-sm"
                >
                  <Upload className="w-4 h-4 text-[#da1a32]" />
                  Upload Logo
                </button>
                {logoPreview ? (
                  <div className="mt-2">
                    <img src={logoPreview} alt="Uploaded logo preview" className="h-12 w-auto rounded-md border border-[#e5e5e5]" />
                  </div>
                ) : null}
                <p className="text-xs text-gray-500 mt-1.5">This logo will appear on your generated ESG Reports.</p>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-[#000000] mb-2">ESG Focus Goals (Select up to 3)</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SDG_OPTIONS.map((sdg) => (
                    <label
                      key={sdg.id}
                      className={`rounded-xl border px-3 py-2 text-sm cursor-pointer transition-all ${
                        selectedSdgs.includes(sdg.id)
                          ? 'border-[#da1a32] bg-red-50 text-[#da1a32] font-medium'
                          : 'border-[#e5e5e5] bg-white text-gray-700 hover:bg-[#edf2f4]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSdgs.includes(sdg.id)}
                        onChange={() => toggleSdg(sdg.id)}
                        className="sr-only"
                      />
                      {sdg.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Our system will prioritize allocating your logistics funds to individual donations that match these goals.
                </p>
              </div>
            </div>
          ) : null}

          {tab === 'wallet' ? (
            <div>
              <div className="rounded-xl border-2 border-[#e5e5e5] bg-white p-5">
                {!walletActivated ? (
                  <div>
                    <p className="text-lg font-bold text-[#000000] inline-flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#da1a32]" />
                      Logistics Sponsorship Wallet
                    </p>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                      Go beyond bulk donations. Sponsor delivery fees for community donors to ensure items reach
                      charities.
                    </p>
                    <p className="mt-3 text-sm font-medium text-gray-700">Status: ⚪ Inactive</p>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      No commitments. Cancel anytime. &gt; Pay only for the deliveries you choose to sponsor. Unused
                      funds are fully refundable.
                    </p>
                    <button
                      onClick={() => setWalletActivated(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#da1a32] text-white text-sm font-medium hover:bg-[#b01528] transition-all"
                    >
                      Activate Logistics Wallet
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-bold text-[#000000] inline-flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#da1a32]" />
                        Logistics Sponsorship Wallet
                      </p>
                      <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 border border-green-200 px-2.5 py-1 text-xs font-semibold">
                        🟢 Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Manage your logistics fund to support community deliveries.</p>

                    <div className="mt-4 rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/30 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current Balance</p>
                      <p className="text-3xl font-bold text-[#000000] mt-1">RM {walletBalance}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={topUpBalance}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#da1a32] text-white text-sm font-medium hover:bg-[#b01528] transition-all"
                        >
                          + Top Up Balance
                        </button>
                        <button
                          onClick={() => ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#e5e5e5] text-sm font-medium hover:bg-[#edf2f4] transition-all"
                        >
                          View Transaction History
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/40 p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">(Optional SaaS Feature Toggle)</p>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#000000]">Auto-Top-Up</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Automatically reload RM 1,000 when the balance falls below RM 200.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={autoTopUp}
                          onClick={() => setAutoTopUp((v) => !v)}
                          className={`relative w-14 h-8 rounded-full transition-all ${autoTopUp ? 'bg-[#da1a32]' : 'bg-gray-300'}`}
                        >
                          <span
                            className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${autoTopUp ? 'left-7' : 'left-1'}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-[#e5e5e5] pt-4">
                      <p className="text-sm font-semibold text-[#000000]">Wallet Management</p>
                      <button
                        onClick={() => setWalletActivated(false)}
                        className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 transition-all"
                      >
                        Deactivate Wallet
                      </button>
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        Deactivating will pause all future logistics sponsorships. Any remaining balance can be refunded
                        to your corporate account or converted into a one-time bulk donation.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className={`mt-5 rounded-xl border-2 p-5 ${walletActivated ? 'border-[#e5e5e5] bg-white' : 'border-[#edf2f4] bg-[#f8fafc]'}`}>
                <p className="text-lg font-bold text-[#000000] inline-flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#da1a32]" />
                  Corporate ESG Targets
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Select the Sustainable Development Goals (SDGs) your company wants to prioritize. Our platform will
                  automatically allocate your Logistics Wallet funds to community donations that match these goals.
                </p>

                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700">
                    Primary Focus Area (Dropdown):
                    <select
                      value={primaryFocus}
                      onChange={(e) => setPrimaryFocus(e.target.value)}
                      disabled={!walletActivated}
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    >
                      <option value="sdg4">SDG 4: Quality Education</option>
                      <option value="sdg12">SDG 12: Responsible Consumption</option>
                      <option value="sdg2">SDG 2: Zero Hunger</option>
                    </select>
                  </label>
                  <label className="text-sm text-gray-700">
                    Secondary Focus Area (Dropdown):
                    <select
                      value={secondaryFocus}
                      onChange={(e) => setSecondaryFocus(e.target.value)}
                      disabled={!walletActivated}
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    >
                      <option value="sdg1">SDG 1: No Poverty</option>
                      <option value="sdg10">SDG 10: Reduced Inequalities</option>
                      <option value="sdg4">SDG 4: Quality Education</option>
                    </select>
                  </label>
                </div>
                {!walletActivated ? (
                  <p className="mt-3 text-xs text-gray-500">Activate Logistics Wallet to set target routing preferences.</p>
                ) : null}
                <button
                  disabled={!walletActivated}
                  onClick={savePreferences}
                  className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#000000] text-white text-sm font-medium hover:bg-[#1f1f1f] transition-all disabled:opacity-40"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          ) : null}

          <div ref={ledgerRef} className="mt-6 pt-4 border-t border-[#e5e5e5]">
            <button
              onClick={saveProfile}
              className="inline-flex items-center gap-2 bg-[#da1a32] text-white px-4 py-2.5 rounded-xl hover:bg-[#b01528] transition-all text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              Save Corporate Profile
            </button>
            {saveNote ? <p className="text-xs text-gray-500 mt-2">{saveNote}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
