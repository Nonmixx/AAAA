'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CorporateLedgerTable } from '../../../components/corporate/CorporateLedgerTable';
import { LedgerDetailsModal } from '../../../components/corporate/LedgerDetailsModal';
import { getSupabaseBrowserClient } from '../../../../lib/supabase/client';
import {
  downloadLedgerReceiptText,
  explainCorporateLedgerFetchFailure,
  fetchCorporateLedgerEntries,
  getCorporatePartnerIdForUser,
  isCorporateLedgerSchemaCacheIssue,
  isCorporateLedgerTableUnavailableMessage,
  loadLocalCorporateLedger,
  mergeDbAndLocalLedger,
  pruneLocalCorporateLedgerAgainstDb,
  type LedgerItem,
  type LedgerStatus,
} from '../../../../lib/supabase/corporate-ledger';

export default function CorporateLedgerHistoryPage() {
  const router = useRouter();
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | LedgerStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledgerLocalFallback, setLedgerLocalFallback] = useState(false);
  const [detailItem, setDetailItem] = useState<LedgerItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setError('Sign in to view your donation history.');
          return;
        }
        const { partnerId, error: partnerErr } = await getCorporatePartnerIdForUser(supabase, user.id);
        if (cancelled) return;
        if (partnerErr || !partnerId) {
          setError(partnerErr?.message ?? 'No corporate partner record for this account.');
          return;
        }
        const { items, error: fetchErr } = await fetchCorporateLedgerEntries(supabase, partnerId);
        if (cancelled) return;
        if (fetchErr) {
          const fullMsg = fetchErr.message;
          const localMerged = mergeDbAndLocalLedger([], loadLocalCorporateLedger(partnerId));
          setLedgerItems(localMerged);
          if (isCorporateLedgerSchemaCacheIssue(fullMsg)) {
            setLedgerLocalFallback(false);
            setError(explainCorporateLedgerFetchFailure(fullMsg));
          } else if (isCorporateLedgerTableUnavailableMessage(fullMsg)) {
            setLedgerLocalFallback(true);
            setError(null);
          } else {
            setLedgerLocalFallback(false);
            setError(explainCorporateLedgerFetchFailure(fullMsg));
          }
          return;
        }
        pruneLocalCorporateLedgerAgainstDb(partnerId, items);
        setLedgerItems(mergeDbAndLocalLedger(items, loadLocalCorporateLedger(partnerId)));
        setLedgerLocalFallback(false);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openLedgerAction = (item: LedgerItem) => {
    if (item.status !== 'pending') {
      downloadLedgerReceiptText(item);
      return;
    }
    window.setTimeout(() => {
      setDetailItem({
        ...item,
        bulkDetails: item.bulkDetails ? { ...item.bulkDetails } : undefined,
      });
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/corporate/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[#000000]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
        <h1 className="text-lg font-bold text-[#000000]">Donation & sponsorship full history</h1>
        <p className="mt-1 text-sm text-gray-600">
          Shows your merged ledger: Supabase when the table exists, plus browser-only rows until you run the SQL
          migration. Pending bulk donations include the full form snapshot in View Details.
        </p>

        {loading ? (
          <p className="py-8 text-sm text-gray-600">Loading…</p>
        ) : (
          <div className="mt-4">
            {error ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 whitespace-pre-line">
                {error}
              </p>
            ) : null}
            {!error && ledgerLocalFallback ? (
              <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950">
                <strong className="font-semibold">Browser-only mode:</strong> run{' '}
                <code className="rounded bg-white/80 px-1 text-xs">supabase/corporate_ledger_entries.sql</code> in
                Supabase to sync this list to the cloud across devices.
              </div>
            ) : null}
            <CorporateLedgerTable
              items={ledgerItems}
              ledgerFilter={ledgerFilter}
              onLedgerFilterChange={setLedgerFilter}
              onRowAction={openLedgerAction}
              subtitle="Filter and browse all saved entries. The dashboard shows only the latest three."
            />
          </div>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          ESG charts and exports live on{' '}
          <Link href="/corporate/reports" className="font-medium text-[#da1a32] hover:underline underline-offset-2">
            Reports
          </Link>
          .
        </p>
      </section>

      <LedgerDetailsModal detailItem={detailItem} onClose={() => setDetailItem(null)} />
    </div>
  );
}
