'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  Wallet,
  Save,
  Upload,
  CreditCard,
  Target,
  X,
  CheckCircle2,
  Loader2,
  Landmark,
  Smartphone,
  History,
} from 'lucide-react';
import { getCorporateMemory, saveCorporateMemory } from '../../../lib/corporate-ai-engine';

type ProfileTab = 'details' | 'wallet';
type TopUpStep = 'amount' | 'gateway' | 'processing' | 'success';
type PayMethodId = 'fpx' | 'card' | 'duitnow';

type WalletTransaction = {
  id: string;
  /** ISO timestamp for sorting and display */
  occurredAtIso: string;
  kind: 'top_up';
  amountRm: number;
  balanceAfterRm: number;
  paymentMethod: PayMethodId;
  reference: string;
};

const TOP_UP_PRESETS = [500, 1000, 2000, 5000] as const;

function formatWalletTxDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function parseWalletTransactionsFromStorage(raw: unknown): WalletTransaction[] {
  if (!Array.isArray(raw)) return [];
  const out: WalletTransaction[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    if (o.kind !== 'top_up') continue;
    const id = typeof o.id === 'string' ? o.id : '';
    const occurredAtIso = typeof o.occurredAtIso === 'string' ? o.occurredAtIso : '';
    const amountRm = Number(o.amountRm);
    const balanceAfterRm = Number(o.balanceAfterRm);
    const pm = o.paymentMethod;
    const ref = typeof o.reference === 'string' ? o.reference : '';
    if (!id || !occurredAtIso || !Number.isFinite(amountRm) || !ref) continue;
    if (pm !== 'fpx' && pm !== 'card' && pm !== 'duitnow') continue;
    out.push({
      id,
      occurredAtIso,
      kind: 'top_up',
      amountRm,
      balanceAfterRm: Number.isFinite(balanceAfterRm) ? balanceAfterRm : 0,
      paymentMethod: pm,
      reference: ref,
    });
  }
  return out;
}

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
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpStep, setTopUpStep] = useState<TopUpStep>('amount');
  const [topUpPreset, setTopUpPreset] = useState<number | 'custom'>(1000);
  const [topUpCustomRm, setTopUpCustomRm] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethodId>('fpx');
  const [lastTopUpRm, setLastTopUpRm] = useState(0);
  const [lastTopUpRef, setLastTopUpRef] = useState('');
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

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
          walletBalance?: string | number;
          walletTransactions?: unknown;
        };
        setCompanyName(parsed.companyName ?? 'Apex Manufacturing Berhad');
        setIndustry(parsed.industry ?? 'Manufacturing & Consumer Goods');
        setLogoPreview(parsed.logoPreview ?? null);
        setWalletActivated(Boolean(parsed.walletActivated));
        setAutoTopUp(parsed.autoTopUp ?? true);
        setPrimaryFocus(parsed.primaryFocus ?? 'sdg4');
        setSecondaryFocus(parsed.secondaryFocus ?? 'sdg1');
        if (parsed.walletBalance != null && parsed.walletBalance !== '') {
          const n = Number(parsed.walletBalance);
          setWalletBalance(Number.isFinite(n) ? n.toFixed(2) : '5000.00');
        }
        setWalletTransactions(parseWalletTransactionsFromStorage(parsed.walletTransactions));
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

  const readProfileStorage = (): Record<string, unknown> => {
    try {
      const raw = window.localStorage.getItem('corporate_profile_v1');
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  const persistTopUpWithTransaction = (nextBalanceStr: string, tx: WalletTransaction) => {
    const prev = readProfileStorage();
    const existing = parseWalletTransactionsFromStorage(prev.walletTransactions);
    const nextList = [tx, ...existing].slice(0, 200);
    window.localStorage.setItem(
      'corporate_profile_v1',
      JSON.stringify({
        ...prev,
        walletBalance: nextBalanceStr,
        walletTransactions: nextList,
      }),
    );
    setWalletTransactions(nextList);
  };

  const resolveTopUpAmountRm = (): number | null => {
    if (topUpPreset === 'custom') {
      const n = Number(topUpCustomRm.replace(/,/g, '').trim());
      if (!Number.isFinite(n) || n <= 0 || n > 500_000) return null;
      return Math.round(n * 100) / 100;
    }
    return topUpPreset;
  };

  const openTopUpModal = () => {
    setTopUpStep('amount');
    setTopUpPreset(1000);
    setTopUpCustomRm('');
    setPayMethod('fpx');
    setLastTopUpRm(0);
    setLastTopUpRef('');
    setTopUpOpen(true);
  };

  const closeTopUpModal = () => {
    setTopUpOpen(false);
    setTopUpStep('amount');
  };

  const goToPaymentGateway = () => {
    const amt = resolveTopUpAmountRm();
    if (amt == null) {
      window.alert('Enter a valid amount between RM 0.01 and RM 500,000.');
      return;
    }
    setTopUpStep('gateway');
  };

  const submitTopUpPayment = () => {
    const amt = resolveTopUpAmountRm();
    if (amt == null) return;
    setTopUpStep('processing');
    window.setTimeout(() => {
      const current = Number(walletBalance) || 0;
      const next = (current + amt).toFixed(2);
      const ref = `TOPUP-${Date.now().toString(36).toUpperCase()}`;
      const tx: WalletTransaction = {
        id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : ref,
        occurredAtIso: new Date().toISOString(),
        kind: 'top_up',
        amountRm: amt,
        balanceAfterRm: Number(next),
        paymentMethod: payMethod,
        reference: ref,
      };
      setWalletBalance(next);
      setLastTopUpRm(amt);
      setLastTopUpRef(ref);
      persistTopUpWithTransaction(next, tx);
      const parsed = Number(next.replace(/[^0-9.]/g, ''));
      saveCorporateMemory({
        targetSdgs: selectedSdgs,
        logisticsWalletBalance: Number.isFinite(parsed) ? parsed : 0,
      });
      setSaveNote(`Top-up successful. RM ${amt.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} added to your wallet.`);
      setTopUpStep('success');
    }, 1600);
  };

  const payMethodLabel = (id: PayMethodId) => {
    if (id === 'fpx') return 'FPX (Malaysian online banking)';
    if (id === 'duitnow') return 'DuitNow QR';
    return 'Credit / debit card';
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
        ...readProfileStorage(),
        companyName,
        industry,
        logoPreview,
        walletActivated,
        autoTopUp,
        primaryFocus,
        secondaryFocus,
        walletBalance,
        walletTransactions,
      }),
    );
    setSaveNote('Corporate profile saved.');
  };

  const topUpModal =
    topUpOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && topUpStep !== 'processing') closeTopUpModal();
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="topup-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 id="topup-modal-title" className="text-lg font-bold text-[#000000]">
                  {topUpStep === 'amount' && 'Top up wallet'}
                  {topUpStep === 'gateway' && 'Payment gateway'}
                  {topUpStep === 'processing' && 'Processing payment'}
                  {topUpStep === 'success' && 'Payment successful'}
                </h2>
                {topUpStep !== 'processing' ? (
                  <button
                    type="button"
                    onClick={closeTopUpModal}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-[#edf2f4]"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {topUpStep === 'amount' ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-gray-600">Choose an amount to add to your Logistics Sponsorship Wallet.</p>
                  <div className="flex flex-wrap gap-2">
                    {TOP_UP_PRESETS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setTopUpPreset(n);
                          setTopUpCustomRm('');
                        }}
                        className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                          topUpPreset === n
                            ? 'border-[#da1a32] bg-red-50 text-[#da1a32]'
                            : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
                        }`}
                      >
                        RM {n.toLocaleString('en-MY')}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTopUpPreset('custom')}
                      className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                        topUpPreset === 'custom'
                          ? 'border-[#da1a32] bg-red-50 text-[#da1a32]'
                          : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {topUpPreset === 'custom' ? (
                    <label className="block text-sm text-gray-700">
                      Amount (RM)
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={topUpCustomRm}
                        onChange={(e) => setTopUpCustomRm(e.target.value)}
                        placeholder="e.g. 750"
                        className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#da1a32]"
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={goToPaymentGateway}
                    className="w-full rounded-xl bg-[#da1a32] py-2.5 text-sm font-semibold text-white hover:bg-[#b01528]"
                  >
                    Continue to payment
                  </button>
                </div>
              ) : null}

              {topUpStep === 'gateway' ? (
                <div className="mt-4 space-y-4">
                  <p className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/40 px-3 py-2 text-sm text-gray-700">
                    You are paying{' '}
                    <strong className="text-[#000000]">
                      RM{' '}
                      {resolveTopUpAmountRm()?.toLocaleString('en-MY', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>{' '}
                    into your corporate logistics wallet (demo checkout — no real charge).
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment method</p>
                  <div className="space-y-2">
                    {(
                      [
                        { id: 'fpx' as const, icon: Landmark, desc: 'Pay via your bank account' },
                        { id: 'duitnow' as const, icon: Smartphone, desc: 'Scan & pay with your banking app' },
                        { id: 'card' as const, icon: CreditCard, desc: 'Visa, Mastercard, AMEX' },
                      ] as const
                    ).map(({ id, icon: Icon, desc }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPayMethod(id)}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left text-sm transition-all ${
                          payMethod === id ? 'border-[#da1a32] bg-red-50' : 'border-[#e5e5e5] hover:bg-[#edf2f4]'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0 text-[#da1a32]" />
                        <span>
                          <span className="font-semibold text-[#000000]">{payMethodLabel(id)}</span>
                          <span className="mt-0.5 block text-xs text-gray-600">{desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    In production this step connects to your payment provider (e.g. Stripe, Curlec, or local FPX). This
                    screen simulates a successful authorization.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTopUpStep('amount')}
                      className="flex-1 rounded-xl border-2 border-[#e5e5e5] py-2.5 text-sm font-medium hover:bg-[#edf2f4]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={submitTopUpPayment}
                      className="flex-1 rounded-xl bg-[#000000] py-2.5 text-sm font-semibold text-white hover:bg-[#1f1f1f]"
                    >
                      Pay securely
                    </button>
                  </div>
                </div>
              ) : null}

              {topUpStep === 'processing' ? (
                <div className="mt-8 flex flex-col items-center py-4">
                  <Loader2 className="h-10 w-10 animate-spin text-[#da1a32]" aria-hidden />
                  <p className="mt-4 text-center text-sm text-gray-600">
                    Contacting {payMethodLabel(payMethod)}…
                    <br />
                    Please do not close this window.
                  </p>
                </div>
              ) : null}

              {topUpStep === 'success' ? (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle2 className="h-14 w-14 text-green-600" aria-hidden />
                  </div>
                  <p className="text-center text-sm text-gray-700">
                    <strong className="text-[#000000]">RM {lastTopUpRm.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>{' '}
                    has been added to your wallet.
                  </p>
                  <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-center text-sm text-green-900">
                    New balance:{' '}
                    <strong>
                      RM {Number(walletBalance).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </p>
                  {lastTopUpRef ? (
                    <p className="text-center text-xs text-gray-500">Reference: {lastTopUpRef}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={closeTopUpModal}
                    className="w-full rounded-xl bg-[#da1a32] py-2.5 text-sm font-semibold text-white hover:bg-[#b01528]"
                  >
                    Done
                  </button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  const reloadTransactionsFromStorage = () => {
    const prev = readProfileStorage();
    setWalletTransactions(parseWalletTransactionsFromStorage(prev.walletTransactions));
  };

  const openHistoryModal = () => {
    reloadTransactionsFromStorage();
    setHistoryOpen(true);
  };

  const closeHistoryModal = () => setHistoryOpen(false);

  const historyModal =
    historyOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[118] flex items-center justify-center bg-black/45 p-4"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeHistoryModal();
            }}
          >
            <div
              className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border-2 border-[#e5e5e5] bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="wallet-history-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#e5e5e5] p-5">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-[#da1a32]" aria-hidden />
                  <h2 id="wallet-history-title" className="text-lg font-bold text-[#000000]">
                    Transaction history
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeHistoryModal}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-[#edf2f4]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {walletTransactions.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No transactions yet. After you complete a top-up, it will appear here with date and time.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {[...walletTransactions]
                      .sort((a, b) => b.occurredAtIso.localeCompare(a.occurredAtIso))
                      .map((tx) => (
                      <li
                        key={tx.id}
                        className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold text-green-700">
                            + RM{' '}
                            {tx.amountRm.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-gray-500">{formatWalletTxDate(tx.occurredAtIso)}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">
                          {payMethodLabel(tx.paymentMethod)} · Ref {tx.reference}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Balance after: RM{' '}
                          {tx.balanceAfterRm.toLocaleString('en-MY', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </li>
                      ))}
                  </ul>
                )}
              </div>
              <div className="shrink-0 border-t border-[#e5e5e5] p-4">
                <button
                  type="button"
                  onClick={closeHistoryModal}
                  className="w-full rounded-xl bg-[#000000] py-2.5 text-sm font-semibold text-white hover:bg-[#1f1f1f]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

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
                          type="button"
                          onClick={openTopUpModal}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#da1a32] text-white text-sm font-medium hover:bg-[#b01528] transition-all"
                        >
                          + Top Up Balance
                        </button>
                        <button
                          type="button"
                          onClick={openHistoryModal}
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
      {topUpModal}
      {historyModal}
    </div>
  );
}
