'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CorporateLedgerTable } from '../../../components/corporate/CorporateLedgerTable';
import { LedgerDetailsModal } from '../../../components/corporate/LedgerDetailsModal';
import { getSupabaseBrowserClient } from '../../../../lib/supabase/client';
import {
  appendLocalCorporateBulkDonation,
  downloadLedgerReceiptText,
  explainCorporateLedgerFetchFailure,
  fetchCorporateLedgerEntries,
  getCorporatePartnerIdForUser,
  insertCorporateBulkLedgerEntry,
  isCorporateLedgerSchemaCacheIssue,
  isCorporateLedgerTableUnavailableMessage,
  loadLocalCorporateLedger,
  mergeDbAndLocalLedger,
  parseBulkUnitsFromLedgerItem,
  parseBulkWeightKgFromLedgerItem,
  pruneLocalCorporateLedgerAgainstDb,
  uploadCorporateBulkDonationPhotos,
  type BulkDonationDetails,
  type LedgerItem,
  type LedgerStatus,
} from '../../../../lib/supabase/corporate-ledger';
import type { LucideIcon } from 'lucide-react';
import {
  Download,
  Leaf,
  Cloud,
  HandHeart,
  ShieldCheck,
  Goal,
  Loader2,
  FileText,
  Boxes,
  Truck,
  Camera,
  X,
} from 'lucide-react';

type ReportState = 'idle' | 'loading' | 'ready';

type MetricCard = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: string;
};

/** Rough CO₂ (tons) from diverted weight — same scale as prior demo (500 kg ≈ 1.2 t). Not a certified carbon audit. */
function estimateCo2TonsFromWasteKg(wasteKg: number): number {
  return wasteKg * 0.0024;
}

function computeMetricCards(items: LedgerItem[]): MetricCard[] {
  const wasteKg = items.reduce((a, i) => a + parseBulkWeightKgFromLedgerItem(i), 0);
  const units = items.reduce((a, i) => a + parseBulkUnitsFromLedgerItem(i), 0);
  const done = items.filter((i) => i.status === 'completed' || i.status === 'delivered').length;
  const denom = items.length;
  const pct = denom ? Math.min(100, Math.round((done / denom) * 100)) : 0;
  const co2Tons = estimateCo2TonsFromWasteKg(wasteKg);

  return [
    {
      title: 'Waste Diverted from Landfill (est.)',
      value: `${wasteKg.toLocaleString('en-GB', { maximumFractionDigits: 1 })} kg`,
      icon: Leaf,
      tone: 'text-green-700 bg-green-50 border-green-100',
    },
    {
      title: 'CO₂ Emissions Saved (est.)',
      value:
        wasteKg > 0
          ? `${co2Tons.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tons`
          : '—',
      icon: Cloud,
      tone: 'text-sky-700 bg-sky-50 border-sky-100',
    },
    {
      title: 'Bulk Units on Record',
      value: units.toLocaleString('en-GB'),
      icon: HandHeart,
      tone: 'text-[#da1a32] bg-red-50 border-red-100',
    },
    {
      title: 'Ledger Completed / Delivered',
      value: denom ? `${pct}%` : '—',
      icon: ShieldCheck,
      tone: 'text-purple-700 bg-purple-50 border-purple-100',
    },
  ];
}

function buildEsgReportMarkdown(items: LedgerItem[]): string {
  const now = new Date();
  const generatedAt = now.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const year = now.getFullYear();
  const wasteKg = items.reduce((a, i) => a + parseBulkWeightKgFromLedgerItem(i), 0);
  const units = items.reduce((a, i) => a + parseBulkUnitsFromLedgerItem(i), 0);
  const done = items.filter((i) => i.status === 'completed' || i.status === 'delivered').length;
  const pending = items.filter((i) => i.status === 'pending').length;
  const co2Tons = estimateCo2TonsFromWasteKg(wasteKg);
  const sdgSet = new Set<string>();
  for (const i of items) {
    const m = i.esgFocus.match(/\bSDG\s*(\d{1,2})\b/i);
    if (m) sdgSet.add(`SDG ${parseInt(m[1], 10)}`);
  }
  const sdgLine = sdgSet.size ? [...sdgSet].join(', ') : '—';

  return [
    `# Q${quarter} ${year} Sustainability & ESG Report (Corporate Partner)`,
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Executive Summary',
    `Figures below are computed from your Donation & Sponsorship Ledger (${items.length} line(s)) in this portal — not static marketing numbers.`,
    '',
    '## Environmental Performance (from ledger)',
    `- Waste diverted (estimated total weight entered on submissions): ${wasteKg.toLocaleString('en-GB', { maximumFractionDigits: 1 })} kg`,
    wasteKg > 0
      ? `- Estimated CO₂ avoided (rough internal factor from weight): ${co2Tons.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tons`
      : '- Estimated CO₂ avoided: add “Estimated total weight (kg)” on bulk donations to produce an estimate.',
    '',
    '## Volume',
    `- Bulk units summed from ledger rows: ${units.toLocaleString('en-GB')}`,
    `- Pending vs completed/delivered: ${pending} pending, ${done} completed or delivered`,
    '',
    '## SDG tags observed (from ledger)',
    `- ${sdgLine}`,
    '',
    '## Governance & Assurance',
    '- Verified NGO handoffs: use ledger statuses (Completed / Delivered) as your internal fulfilment indicator; extend with real logistics data when available.',
    '',
    '## Next steps',
    '1. Keep estimated weights on bulk submissions current for better environmental estimates.',
    '2. When logistics sponsorship is tracked in the same ledger, these totals can include wallet-funded deliveries.',
  ].join('\n');
}

export default function CorporateDashboardPage() {
  const router = useRouter();
  const [reportState, setReportState] = useState<ReportState>('idle');
  const [showBulkDonationModal, setShowBulkDonationModal] = useState(false);
  const [impactEvents, setImpactEvents] = useState<string[]>([
    'RM 15 from your wallet funded a delivery of Textbooks to Hope School.',
    'Your bulk donation of 20 Monitors arrived at Pages Library.',
  ]);
  const [corporatePartnerId, setCorporatePartnerId] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerLocalFallback, setLedgerLocalFallback] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | LedgerStatus>('all');
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [assetCategory, setAssetCategory] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState('');
  const [assetCondition, setAssetCondition] = useState<'like_new' | 'gently_used' | 'minor_repair'>('like_new');
  const [pickupLocation, setPickupLocation] = useState('');
  const [availablePickupDate, setAvailablePickupDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [primaryImpactGoal, setPrimaryImpactGoal] = useState('SDG 12: Responsible Consumption and Production');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [bulkFormKey, setBulkFormKey] = useState(0);
  const [detailItem, setDetailItem] = useState<LedgerItem | null>(null);

  const metricCards = useMemo(() => computeMetricCards(ledgerItems), [ledgerItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLedgerLoading(true);
      setLedgerError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setLedgerError('Sign in to load your ledger.');
            setCorporatePartnerId(null);
            setLedgerItems([]);
          }
          return;
        }
        const { partnerId, error: partnerErr } = await getCorporatePartnerIdForUser(supabase, user.id);
        if (cancelled) return;
        if (partnerErr || !partnerId) {
          setLedgerError(partnerErr?.message ?? 'No corporate partner record for this account.');
          setCorporatePartnerId(null);
          setLedgerItems([]);
          return;
        }
        setCorporatePartnerId(partnerId);
        const { items, error: fetchErr } = await fetchCorporateLedgerEntries(supabase, partnerId);
        if (cancelled) return;
        if (fetchErr) {
          const fullMsg = fetchErr.message;
          const localMerged = mergeDbAndLocalLedger([], loadLocalCorporateLedger(partnerId));
          setLedgerItems(localMerged);
          if (isCorporateLedgerSchemaCacheIssue(fullMsg)) {
            setLedgerLocalFallback(false);
            setLedgerError(explainCorporateLedgerFetchFailure(fullMsg));
          } else if (isCorporateLedgerTableUnavailableMessage(fullMsg)) {
            setLedgerLocalFallback(true);
            setLedgerError(null);
          } else {
            setLedgerLocalFallback(false);
            setLedgerError(explainCorporateLedgerFetchFailure(fullMsg));
          }
          return;
        }
        pruneLocalCorporateLedgerAgainstDb(partnerId, items);
        setLedgerItems(mergeDbAndLocalLedger(items, loadLocalCorporateLedger(partnerId)));
        setLedgerLocalFallback(false);
      } catch (e) {
        if (!cancelled) setLedgerError(e instanceof Error ? e.message : 'Unable to load ledger.');
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generateReport = async () => {
    if (reportState === 'loading') return;
    setReportState('loading');
    try {
      if (corporatePartnerId) {
        const supabase = getSupabaseBrowserClient();
        const { items, error } = await fetchCorporateLedgerEntries(supabase, corporatePartnerId);
        if (!error) {
          pruneLocalCorporateLedgerAgainstDb(corporatePartnerId, items);
          setLedgerItems(mergeDbAndLocalLedger(items, loadLocalCorporateLedger(corporatePartnerId)));
          setLedgerLocalFallback(false);
        }
      }
    } finally {
      // Keep a short loading state for UX continuity, but render from latest fetched ledger data.
      window.setTimeout(() => setReportState('ready'), 800);
    }
  };

  const createBulkDonationDraft = () => {
    setDetailItem(null);
    setShowBulkDonationModal(true);
  };

  const submitBulkDonation = async () => {
    if (!assetCategory || !itemDescription || !totalUnits || !pickupLocation || !availablePickupDate) {
      window.alert('Please complete all required donation fields before submitting.');
      return;
    }
    if (!corporatePartnerId) {
      window.alert('Your corporate account is not linked yet. Sign out and sign in again, or run the database migration for corporate_ledger_entries.');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    let photoUrls: string[] | undefined;
    if (photoFiles.length > 0) {
      const { urls, error: upErr } = await uploadCorporateBulkDonationPhotos(
        supabase,
        corporatePartnerId,
        photoFiles,
      );
      if (upErr) {
        window.alert(
          [
            'Photo upload failed (your donation will still be saved without image files):',
            upErr.message,
            '',
            'If the bucket is missing, create bucket corporate_bulk_donation_photos (public) and run:',
            'supabase/corporate_bulk_donation_photos_storage.sql',
          ].join('\n'),
        );
      } else if (urls.length > 0) {
        photoUrls = urls;
      }
    }

    const bulkDetails: BulkDonationDetails = {
      assetCategory,
      itemDescription,
      totalUnits,
      estimatedWeightKg: estimatedWeightKg || '',
      assetCondition,
      pickupLocation,
      availablePickupDate,
      contactName,
      contactPhone,
      primaryImpactGoal,
      photoFileCount: photoFiles.length,
      ...(photoUrls && photoUrls.length > 0 ? { photoUrls } : {}),
    };
    const esgFocus = primaryImpactGoal.replace(':', '').slice(0, 6).includes('SDG')
      ? (primaryImpactGoal.split(':')[0] ?? 'SDG 12')
      : 'SDG 12';
    const { error: insertErr } = await insertCorporateBulkLedgerEntry(supabase, corporatePartnerId, {
      activityType: `Bulk Asset: ${assetCategory}`,
      amountOrQty: `${totalUnits} units`,
      esgFocus,
      notes: itemDescription,
      bulkDetails,
    });
    if (insertErr) {
      if (isCorporateLedgerTableUnavailableMessage(insertErr.message)) {
        appendLocalCorporateBulkDonation(corporatePartnerId, {
          activityType: `Bulk Asset: ${assetCategory}`,
          amountOrQty: `${totalUnits} units`,
          esgFocus,
          notes: itemDescription,
          bulkDetails,
        });
        setLedgerLocalFallback(true);
        const { items: retryItems, error: retryErr } = await fetchCorporateLedgerEntries(
          supabase,
          corporatePartnerId,
        );
        if (retryErr && isCorporateLedgerTableUnavailableMessage(retryErr.message)) {
          setLedgerItems(loadLocalCorporateLedger(corporatePartnerId));
        } else if (!retryErr) {
          pruneLocalCorporateLedgerAgainstDb(corporatePartnerId, retryItems);
          setLedgerItems(mergeDbAndLocalLedger(retryItems, loadLocalCorporateLedger(corporatePartnerId)));
          setLedgerLocalFallback(false);
        } else {
          setLedgerItems(loadLocalCorporateLedger(corporatePartnerId));
        }
      } else {
        window.alert(explainCorporateLedgerFetchFailure(insertErr.message));
        return;
      }
    } else {
      const { items, error: reloadErr } = await fetchCorporateLedgerEntries(supabase, corporatePartnerId);
      if (reloadErr) {
        window.alert(`Saved, but list refresh failed:\n${explainCorporateLedgerFetchFailure(reloadErr.message)}`);
        return;
      }
      pruneLocalCorporateLedgerAgainstDb(corporatePartnerId, items);
      setLedgerItems(mergeDbAndLocalLedger(items, loadLocalCorporateLedger(corporatePartnerId)));
      setLedgerLocalFallback(false);
    }
    setImpactEvents((prev) => [
      `Bulk donation submitted: ${totalUnits} units (${assetCategory}) queued for AI matching under ${primaryImpactGoal}.`,
      ...prev,
    ]);
    setShowBulkDonationModal(false);
    setLedgerFilter('all');
    setAssetCategory('');
    setItemDescription('');
    setTotalUnits('');
    setEstimatedWeightKg('');
    setAssetCondition('like_new');
    setPickupLocation('');
    setAvailablePickupDate('');
    setContactName('');
    setContactPhone('');
    setPrimaryImpactGoal('SDG 12: Responsible Consumption and Production');
    setPhotoFiles([]);
    setBulkFormKey((k) => k + 1);
  };

  const openLedgerAction = (item: LedgerItem) => {
    if (item.status !== 'pending') {
      downloadLedgerReceiptText(item);
      return;
    }
    // Defer open so the click that opened the dialog cannot hit a new underlay in the same frame.
    // Portal to document.body avoids clipping / z-index traps from layout ancestors.
    window.setTimeout(() => {
      setDetailItem({
        ...item,
        bulkDetails: item.bulkDetails ? { ...item.bulkDetails } : undefined,
      });
    }, 0);
  };

  const goToWalletTopUp = () => {
    router.push('/corporate/profile?tab=wallet');
  };

  if (reportState === 'loading') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-8">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#da1a32]" />
            <h1 className="text-xl font-bold text-[#000000]">GLM Report Generation In Progress</h1>
          </div>
          <p className="text-gray-600 text-sm">
            Refreshing your latest ledger rows and generating an ESG narrative directly from current uploaded data...
          </p>
        </div>
      </div>
    );
  }

  if (reportState === 'ready') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-8">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#da1a32]" />
              <h1 className="text-xl font-bold text-[#000000]">Generated ESG Report</h1>
            </div>
            <button
              onClick={() => setReportState('idle')}
              className="text-sm border border-[#e5e5e5] px-3 py-1.5 rounded-lg hover:bg-[#edf2f4] transition-all"
            >
              Back to Dashboard
            </button>
          </div>
          <article className="prose prose-sm max-w-none whitespace-pre-line text-[#000000] leading-relaxed">
            {buildEsgReportMarkdown(ledgerItems)}
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            ESG REPORTING TRIGGER
          </p>
          <h1 className="text-2xl font-bold text-[#000000]">Live Sustainability & ESG Report is Ready.</h1>
          <p className="text-xs text-gray-500 mt-1">This report always uses your latest saved ledger rows.</p>
          <p className="text-sm text-gray-600 mt-1">
            Generate a polished, copy-ready narrative from your tracked bulk donations and sponsored logistics data.
          </p>
        </div>
        <button
          onClick={generateReport}
          className="inline-flex items-center justify-center gap-2 bg-[#da1a32] text-white px-5 py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-sm font-medium"
        >
          <Download className="w-4 h-4" /> Generate ESG Report
        </button>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.title} className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
              <div className={`inline-flex items-center justify-center rounded-xl border p-2 ${m.tone}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-[#000000] mt-3">{m.value}</p>
              <p className="text-sm text-gray-600 mt-1">{m.title}</p>
            </div>
          );
        })}
      </section>
      <p className="text-xs text-gray-500 -mt-2 px-1">
        KPI cards follow your Donation and Sponsorship Ledger. Enter estimated weight (kg) on bulk submissions for
        waste and CO₂ estimates; units are summed from submitted quantities on each ledger line.
      </p>

      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Goal className="w-4 h-4 text-[#da1a32]" />
          <h2 className="text-lg font-bold text-[#000000]">Make an Impact</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-[#e5e5e5] bg-[#edf2f4]/30 p-5">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center">
              <Boxes className="w-5 h-5 text-[#da1a32]" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#000000]">Donate Corporate Assets</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Clear out surplus inventory or office equipment. Your items will be directly matched with verified NGOs.
            </p>
            <button
              onClick={createBulkDonationDraft}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#da1a32] text-white text-sm font-medium hover:bg-[#b01528] transition-all"
            >
              + New Bulk Donation
            </button>
          </div>
          <div className="rounded-xl border-2 border-[#e5e5e5] bg-[#edf2f4]/30 p-5">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#da1a32]" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#000000]">Fund Community Logistics</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Sponsor delivery fees for individual donors who cannot transport their items to charities.
            </p>
            <button
              onClick={goToWalletTopUp}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#000000] text-white text-sm font-medium hover:bg-[#1f1f1f] transition-all"
            >
              + Top Up Logistics Wallet
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Goal className="w-4 h-4 text-[#da1a32]" />
          <h2 className="text-lg font-bold text-[#000000]">Live Impact</h2>
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          {impactEvents.map((event) => (
            <div key={event} className="rounded-lg border border-[#e5e5e5] bg-[#edf2f4]/40 px-3 py-2.5">
              {event}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#000000]">📋 Donation & Sponsorship Ledger</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing the three most recent entries from your saved activity. Use View Full History for the complete list.
          </p>
        </div>
        {ledgerLocalFallback ? (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950">
            <strong className="font-semibold">Browser-only mode:</strong> the Supabase table{' '}
            <code className="rounded bg-white/80 px-1 text-xs">corporate_ledger_entries</code> is not set up yet, so
            new donations are stored in this browser. They survive refresh and logout on the same device, but not
            across devices. Run <code className="text-xs">supabase/corporate_ledger_entries.sql</code> in your project
            to enable cloud storage.
          </div>
        ) : null}
        {ledgerLoading ? (
          <p className="text-sm text-gray-600 py-6">Loading ledger…</p>
        ) : (
          <>
            {ledgerError ? (
              <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 whitespace-pre-line">
                {ledgerError}
              </p>
            ) : null}
            <CorporateLedgerTable
              items={ledgerItems}
              ledgerFilter={ledgerFilter}
              onLedgerFilterChange={setLedgerFilter}
              maxRows={3}
              onRowAction={openLedgerAction}
            />
          </>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push('/corporate/history')}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#da1a32] hover:underline underline-offset-2"
          >
            View Full History ➔
          </button>
        </div>
      </section>

      {showBulkDonationModal ? (
        <div className="fixed inset-0 z-[90] bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-2xl">
            <div className="p-5 border-b border-[#e5e5e5] flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-[#000000]">📦 Submit Corporate Assets for Donation</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enter the details of your surplus assets. Our system will route these items to verified NGOs to maximize your ESG impact.
                </p>
              </div>
              <button
                onClick={() => setShowBulkDonationModal(false)}
                className="rounded-lg p-1.5 hover:bg-[#edf2f4] text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <section>
                <h4 className="text-sm font-bold text-[#000000] mb-3">Section 1: Asset Details</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="text-sm text-gray-700">
                    Asset Category (Dropdown):
                    <select
                      value={assetCategory}
                      onChange={(e) => setAssetCategory(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    >
                      <option value="">Select Category</option>
                      <option value="IT & Electronics">IT & Electronics</option>
                      <option value="Office Furniture">Office Furniture</option>
                      <option value="Surplus Apparel">Surplus Apparel</option>
                      <option value="Non-Perishable Food">Non-Perishable Food</option>
                    </select>
                  </label>
                  <label className="text-sm text-gray-700 md:col-span-2">
                    Item Description (Text Area):
                    <textarea
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Briefly describe the items (e.g., 50 Dell Monitors, gently used)"
                      className="mt-1.5 w-full min-h-[90px] rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Total Units:
                    <input
                      value={totalUnits}
                      onChange={(e) => setTotalUnits(e.target.value)}
                      placeholder="e.g., 50"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Estimated Total Weight (kg):
                    <input
                      value={estimatedWeightKg}
                      onChange={(e) => setEstimatedWeightKg(e.target.value)}
                      placeholder="e.g., 200"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used to calculate CO2 saved and logistics requirements.</p>
                  </label>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-1.5">Asset Condition (Radio Buttons):</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex items-center gap-1.5">
                      <input type="radio" checked={assetCondition === 'like_new'} onChange={() => setAssetCondition('like_new')} />
                      Like New
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input type="radio" checked={assetCondition === 'gently_used'} onChange={() => setAssetCondition('gently_used')} />
                      Gently Used
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input type="radio" checked={assetCondition === 'minor_repair'} onChange={() => setAssetCondition('minor_repair')} />
                      Needs Minor Repair
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-1.5">Upload Photos (Drag & Drop Area):</p>
                  <label className="block rounded-xl border-2 border-dashed border-[#e5e5e5] bg-[#edf2f4]/30 px-4 py-6 text-center cursor-pointer hover:bg-[#edf2f4]/50">
                    <Camera className="w-5 h-5 text-[#da1a32] mx-auto mb-2" />
                    <span className="text-sm text-gray-700">📷 Drag and drop images here, or browse files</span>
                    <input
                      key={bulkFormKey}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {photoFiles.length ? <p className="text-xs text-gray-500 mt-1">{photoFiles.length} photo(s) selected</p> : null}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold text-[#000000] mb-3">Section 2: Logistics & Handoff</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="text-sm text-gray-700">
                    Pickup Location (Dropdown/Text):
                    <input
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="Select registered corporate address or enter new warehouse location"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Available Date for Pickup (Date Picker):
                    <input
                      type="date"
                      value={availablePickupDate}
                      onChange={(e) => setAvailablePickupDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Name:
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Contact name"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Phone:
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+60 1X-XXX XXXX"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold text-[#000000] mb-3">Section 3: ESG Target Alignment</h4>
                <label className="text-sm text-gray-700 block">
                  Primary Impact Goal (Dropdown):
                  <select
                    value={primaryImpactGoal}
                    onChange={(e) => setPrimaryImpactGoal(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                  >
                    <option value="SDG 12: Responsible Consumption and Production">
                      SDG 12: Responsible Consumption and Production
                    </option>
                    <option value="SDG 4: Quality Education">SDG 4: Quality Education</option>
                    <option value="SDG 1: No Poverty">SDG 1: No Poverty</option>
                    <option value="SDG 2: Zero Hunger">SDG 2: Zero Hunger</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which corporate SDG target this specific bulk donation should count toward.
                  </p>
                </label>
              </section>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#e5e5e5] p-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowBulkDonationModal(false)}
                className="px-3.5 py-2 rounded-lg border border-[#e5e5e5] text-sm hover:bg-[#edf2f4]"
              >
                Cancel
              </button>
              <button
                onClick={submitBulkDonation}
                className="px-3.5 py-2 rounded-lg bg-[#da1a32] text-white text-sm font-medium hover:bg-[#b01528]"
              >
                Submit Assets for AI Matching
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <LedgerDetailsModal detailItem={detailItem} onClose={() => setDetailItem(null)} />
    </div>
  );
}
