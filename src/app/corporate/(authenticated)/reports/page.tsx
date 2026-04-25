'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileText,
  BarChart3,
  PieChart,
  CalendarRange,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '../../../../lib/supabase/client';
import {
  explainCorporateLedgerFetchFailure,
  fetchCorporateLedgerEntries,
  getCorporatePartnerIdForUser,
  isCorporateLedgerSchemaCacheIssue,
  isCorporateLedgerTableUnavailableMessage,
  loadLocalCorporateLedger,
  mergeDbAndLocalLedger,
  parseBulkUnitsFromLedgerItem,
  parseBulkWeightKgFromLedgerItem,
  pruneLocalCorporateLedgerAgainstDb,
  type LedgerItem,
} from '../../../../lib/supabase/corporate-ledger';

const PIE_COLORS = ['#da1a32', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'];

/** Reports UI only lists this calendar year (no adjacent years in the quarter dropdown). */
const REPORTS_YEAR = 2026;

function parseQuarterKey(quarter: string): { year: number; q: number } | null {
  const m = quarter.match(/q(\d)_(\d{4})/);
  if (!m) return null;
  const q = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  if (q < 1 || q > 4 || !Number.isFinite(year)) return null;
  return { year, q };
}

function quarterUtcRange(year: number, q: number): { start: Date; end: Date } {
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
  return { start, end };
}

function quarterLabel(year: number, q: number): string {
  const startMonth = (q - 1) * 3;
  const a = new Date(Date.UTC(year, startMonth, 1));
  const b = new Date(Date.UTC(year, startMonth + 2, 1));
  const fmt = (d: Date) => d.toLocaleString('en-GB', { month: 'short' });
  return `${fmt(a)}–${fmt(b)} ${year}`;
}

/** Calendar quarter from “today” (local), pinned to {@link REPORTS_YEAR}, e.g. April → Q2. */
function inferDefaultQuarterKey(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `q${q}_${REPORTS_YEAR}`;
}

function quarterSelectOptions(): { value: string; label: string }[] {
  const y = REPORTS_YEAR;
  const out: { value: string; label: string }[] = [];
  for (let q = 1; q <= 4; q++) {
    out.push({
      value: `q${q}_${y}`,
      label: `Q${q} ${y} (${quarterLabel(y, q)})`,
    });
  }
  return out;
}

function itemInQuarter(item: LedgerItem, start: Date, end: Date): boolean {
  if (!item.occurredAtIso) return true;
  const d = new Date(item.occurredAtIso);
  return d >= start && d <= end;
}

function categoryLabelFromItem(item: LedgerItem): string {
  const c = item.bulkDetails?.assetCategory?.trim();
  if (c) return c;
  const at = item.activityType;
  const m = at.match(/Bulk Asset:\s*(.+)/i);
  if (m) return m[1].trim();
  if (/logistics/i.test(at)) return 'Logistics sponsorship';
  return 'Other';
}

/** e.g. "SDG 12: Responsible…" → "SDG 12"; missing match → "". */
function extractSdgCode(esgFocus: string): string {
  const m = esgFocus.trim().match(/\bSDG\s*(\d{1,2})\b/i);
  return m ? `SDG ${parseInt(m[1], 10)}` : '';
}

function uniqueSdgTagsFromItems(items: LedgerItem[]): string[] {
  const set = new Set<string>();
  for (const i of items) {
    const c = extractSdgCode(i.esgFocus);
    if (c) set.add(c);
  }
  return [...set].sort(
    (a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10),
  );
}

function csvEsc(s: string): string {
  return `"${String(s).replace(/"/g, '""')}"`;
}

function formatDateLocal(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function matchesImpactArea(item: LedgerItem, area: string): boolean {
  if (area === 'all') return true;
  const esg = item.esgFocus.toLowerCase();
  const act = item.activityType.toLowerCase();
  if (area === 'environmental') {
    // Use \\b so "SDG 12" does not match the "SDG 1" branch of an ordered alternation.
    return (
      /\bsdgs?\s*0*(?:1|2|12|13|15)\b/i.test(esg) ||
      /\bsdgs?\s*0*4\b/i.test(esg) ||
      /food|furniture|electronics|apparel|waste|climate|land|surplus/i.test(act)
    );
  }
  if (area === 'social') {
    return /\bsdgs?\s*0*(?:1|3|4|5|10|11)\b/i.test(esg) || /education|hope|school|community|health|logistics/i.test(act);
  }
  if (area === 'governance') {
    return /\bsdgs?\s*0*(?:16|17)\b/i.test(esg) || /governance|compliance|audit/i.test(act);
  }
  return true;
}

type CategorySlice = { label: string; pct: number; weight: number; color: string };

function aggregateCategorySlices(items: LedgerItem[]): CategorySlice[] {
  const buckets = new Map<string, number>();
  for (const item of items) {
    const cat = categoryLabelFromItem(item);
    const w = parseBulkUnitsFromLedgerItem(item);
    buckets.set(cat, (buckets.get(cat) ?? 0) + (w > 0 ? w : 1));
  }
  const total = [...buckets.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.map(([label, weight], i) => ({
    label,
    weight,
    pct: (weight / total) * 100,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
}

function conicFromSlices(slices: CategorySlice[]): string {
  if (slices.length === 0) return 'conic-gradient(#e5e5e5 0deg 360deg)';
  let acc = 0;
  const parts: string[] = [];
  for (const s of slices) {
    const start = acc;
    acc += (s.pct / 100) * 360;
    parts.push(`${s.color} ${start}deg ${acc}deg`);
  }
  if (acc < 360) parts.push(`#edf2f4 ${acc}deg 360deg`);
  return `conic-gradient(${parts.join(', ')})`;
}

type MonthRow = { month: string; count: number; monthIndex: number };

function monthsInQuarter(year: number, q: number): MonthRow[] {
  const startMonth = (q - 1) * 3;
  return [0, 1, 2].map((i) => {
    const d = new Date(Date.UTC(year, startMonth + i, 1));
    return {
      month: d.toLocaleString('en-GB', { month: 'short' }),
      monthIndex: startMonth + i,
      count: 0,
    };
  });
}

function ledgerCountsByMonth(items: LedgerItem[], year: number, q: number): MonthRow[] {
  const rows = monthsInQuarter(year, q);
  for (const item of items) {
    if (!item.occurredAtIso) continue;
    const d = new Date(item.occurredAtIso);
    if (d.getUTCFullYear() !== year) continue;
    const mi = d.getUTCMonth();
    const row = rows.find((r) => r.monthIndex === mi);
    if (row) row.count += 1;
  }
  return rows;
}

/** UTF-8 BOM helps Excel recognise encoding; columns are human-readable for ESG review. */
function ledgerToCsvRows(items: LedgerItem[]): string {
  const header =
    'date_submitted,sdg_code,esg_focus,asset_category,activity_type,units,est_weight_kg,status,description,ledger_id,occurred_at_iso\n';
  const lines = items.map((i) => {
    const sdg = extractSdgCode(i.esgFocus) || '—';
    const cat = categoryLabelFromItem(i);
    const units = parseBulkUnitsFromLedgerItem(i);
    const w = parseBulkWeightKgFromLedgerItem(i);
    return [
      formatDateLocal(i.occurredAtIso),
      sdg,
      i.esgFocus,
      cat,
      i.activityType,
      String(units),
      w > 0 ? String(w) : '',
      i.status,
      i.notes ?? '',
      i.id,
      i.occurredAtIso ?? '',
    ]
      .map(csvEsc)
      .join(',');
  });
  return `\uFEFF${header}${lines.join('\n')}`;
}

function buildEsgArchiveNarrative(
  items: LedgerItem[],
  periodLabel: string,
  quarterKey: string,
  impact: string,
  slices: CategorySlice[],
  months: MonthRow[],
): string {
  const sdgs = uniqueSdgTagsFromItems(items);
  const totalUnits = items.reduce((a, i) => a + parseBulkUnitsFromLedgerItem(i), 0);
  const totalKg = items.reduce((a, i) => a + parseBulkWeightKgFromLedgerItem(i), 0);
  return [
    'CORPORATE ESG SNAPSHOT',
    '======================',
    `Reporting period: ${periodLabel}`,
    `Quarter filter: ${quarterKey}`,
    `Impact area filter: ${impact}`,
    `Ledger lines included: ${items.length}`,
    '',
    'SDG GOALS (from ledger)',
    '-----------------------',
    ...(sdgs.length ? sdgs.map((s) => `  • ${s}`) : ['  (no SDG codes found in esg_focus)']),
    '',
    'UNITS & ESTIMATED WEIGHT',
    '------------------------',
    `  • Total units: ${totalUnits.toLocaleString('en-GB')}`,
    `  • Total est. weight (kg): ${totalKg > 0 ? totalKg.toLocaleString('en-GB', { maximumFractionDigits: 1 }) : '—'}`,
    '',
    'ACTIVITY BY CATEGORY (unit-weighted %)',
    '----------------------------------------',
    ...(slices.length
      ? slices.map((s) => `  • ${s.label}: ${s.pct.toFixed(1)}% (weight ${s.weight})`)
      : ['  (none)']),
    '',
    'LINES PER MONTH IN QUARTER',
    '--------------------------',
    ...(months.length ? months.map((m) => `  • ${m.month}: ${m.count}`) : ['  (none)']),
    '',
    'LINE INDEX (open the .csv for full columns)',
    '--------------------------------------------',
    ...items.map((i, idx) => {
      const sdg = extractSdgCode(i.esgFocus) || '—';
      const u = parseBulkUnitsFromLedgerItem(i);
      const note = (i.notes ?? '').replace(/\s+/g, ' ').trim().slice(0, 100);
      return `  ${idx + 1}. [${sdg}] ${formatDateLocal(i.occurredAtIso)} | ${i.status} | ${categoryLabelFromItem(i)} | ${u} units | ${note}`;
    }),
  ].join('\n');
}

export default function CorporateReportsPage() {
  const [quarter, setQuarter] = useState(inferDefaultQuarterKey);
  const [impactArea, setImpactArea] = useState('all');
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

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
          if (!cancelled) setLedgerError('Sign in to load report data.');
          return;
        }
        const { partnerId, error: partnerErr } = await getCorporatePartnerIdForUser(supabase, user.id);
        if (cancelled) return;
        if (partnerErr || !partnerId) {
          setLedgerError(partnerErr?.message ?? 'No corporate partner record for this account.');
          return;
        }
        const { items, error: fetchErr } = await fetchCorporateLedgerEntries(supabase, partnerId);
        if (cancelled) return;
        if (fetchErr) {
          const fullMsg = fetchErr.message;
          const localMerged = mergeDbAndLocalLedger([], loadLocalCorporateLedger(partnerId));
          setLedgerItems(localMerged);
          if (isCorporateLedgerSchemaCacheIssue(fullMsg)) {
            setLedgerError(explainCorporateLedgerFetchFailure(fullMsg));
          } else if (isCorporateLedgerTableUnavailableMessage(fullMsg)) {
            setLedgerError(null);
          } else {
            setLedgerError(explainCorporateLedgerFetchFailure(fullMsg));
          }
          return;
        }
        pruneLocalCorporateLedgerAgainstDb(partnerId, items);
        setLedgerItems(mergeDbAndLocalLedger(items, loadLocalCorporateLedger(partnerId)));
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

  const filteredItems = useMemo(() => {
    const pq = parseQuarterKey(quarter);
    if (!pq) return ledgerItems.filter((i) => matchesImpactArea(i, impactArea));
    const { start, end } = quarterUtcRange(pq.year, pq.q);
    return ledgerItems.filter((i) => itemInQuarter(i, start, end) && matchesImpactArea(i, impactArea));
  }, [ledgerItems, quarter, impactArea]);

  const categorySlices = useMemo(() => aggregateCategorySlices(filteredItems), [filteredItems]);

  const monthlyRows = useMemo(() => {
    const pq = parseQuarterKey(quarter);
    if (!pq) return [];
    return ledgerCountsByMonth(filteredItems, pq.year, pq.q);
  }, [filteredItems, quarter]);

  const maxMonthly = useMemo(() => {
    if (monthlyRows.length === 0) return 1;
    return Math.max(1, ...monthlyRows.map((m) => m.count));
  }, [monthlyRows]);

  const archiveRows = useMemo(() => {
    const pq = parseQuarterKey(quarter);
    if (!pq || filteredItems.length === 0) return [];
    const sdgs = uniqueSdgTagsFromItems(filteredItems);
    return [
      {
        id: `ledger-${quarter}`,
        name: `Corporate ledger — ${quarterLabel(pq.year, pq.q)}`,
        period: quarterLabel(pq.year, pq.q),
        sdgFocus: sdgs.length ? sdgs.join(', ') : '—',
      },
    ];
  }, [filteredItems, quarter]);

  const filterHidesRows =
    !ledgerLoading && ledgerItems.length > 0 && filteredItems.length === 0 && !ledgerError;

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const pq = parseQuarterKey(quarter);
    const catLines = categorySlices.map((s) => `- ${s.label}: ${s.pct.toFixed(1)}% (units weight ${s.weight})`);
    const monthLines = monthlyRows.map((m) => `- ${m.month}: ${m.count} ledger line(s)`);
    const content = [
      `Corporate ESG export (${quarter})`,
      `Impact area filter: ${impactArea}`,
      `Rows in scope: ${filteredItems.length}`,
      '',
      'Items by category (from ledger, by unit weight):',
      ...(catLines.length ? catLines : ['- (no rows in this quarter / filter)']),
      '',
      'Ledger activity by month (rows with occurred date in quarter):',
      ...(monthLines.length ? monthLines : ['- (none)']),
    ].join('\n');
    downloadFile(`esg-report-${quarter}.txt`, content, 'text/plain;charset=utf-8');
  };

  const exportCsv = () => {
    downloadFile(`ledger-${quarter}.csv`, ledgerToCsvRows(filteredItems), 'text/csv;charset=utf-8');
  };

  const downloadArchiveLedgerCsv = () => {
    downloadFile(`corporate-ledger-${quarter}.csv`, ledgerToCsvRows(filteredItems), 'text/csv;charset=utf-8');
  };

  const downloadArchiveEsgSummary = (period: string) => {
    const body = buildEsgArchiveNarrative(
      filteredItems,
      period,
      quarter,
      impactArea,
      categorySlices,
      monthlyRows,
    );
    downloadFile(`esg-summary-${quarter}.txt`, body, 'text/plain;charset=utf-8');
  };

  const pq = parseQuarterKey(quarter);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-[#000000] inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#da1a32]" />
            Custom Report Builder & Visualizer
          </h1>
          <div className="flex flex-wrap gap-2">
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="rounded-xl border-2 border-[#e5e5e5] px-3 py-2 text-sm"
            >
              {quarterSelectOptions().map((o) => (
                <option key={o.value} value={o.value}>
                  Quarter: {o.label}
                </option>
              ))}
            </select>
            <select
              value={impactArea}
              onChange={(e) => setImpactArea(e.target.value)}
              className="rounded-xl border-2 border-[#e5e5e5] px-3 py-2 text-sm"
            >
              <option value="all">Select Impact Area: All</option>
              <option value="environmental">Select Impact Area: Environmental</option>
              <option value="social">Select Impact Area: Social</option>
              <option value="governance">Select Impact Area: Governance</option>
            </select>
            <button
              type="button"
              onClick={exportPdf}
              disabled={ledgerLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm hover:bg-[#edf2f4] disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-[#da1a32]" /> Export summary (.txt)
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={ledgerLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm hover:bg-[#edf2f4] disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-[#da1a32]" /> Export ledger CSV
            </button>
          </div>
        </div>

        {ledgerError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 whitespace-pre-line">
            {ledgerError}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-gray-500">
          Charts and exports use your <strong>corporate_ledger_entries</strong> data (merged with any browser-only
          fallback), filtered by quarter and impact area. April–June is <strong>Q2</strong>, not Q1.
        </p>
        {filterHidesRows ? (
          <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            You have <strong>{ledgerItems.length}</strong> ledger row(s), but none match this quarter and impact
            filter. Choose the quarter that contains your submission dates (e.g. April 2026 → <strong>Q2 2026</strong>)
            or set impact area to <strong>All</strong>.
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#e5e5e5] p-4">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#000000]">
              <PieChart className="h-4 w-4 text-[#da1a32]" />
              Bulk activity by category
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="h-40 w-40 shrink-0 rounded-full"
                style={{ background: conicFromSlices(categorySlices) }}
              />
              <div className="space-y-2 text-sm text-gray-700">
                {ledgerLoading ? (
                  <p className="text-gray-500">Loading…</p>
                ) : categorySlices.length === 0 ? (
                  <p className="text-gray-500">No ledger rows in this quarter/filter, or no unit quantities recorded.</p>
                ) : (
                  categorySlices.map((s) => (
                    <p key={s.label}>
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.pct.toFixed(1)}% {s.label}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e5e5] p-4">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#000000]">
              <CalendarRange className="h-4 w-4 text-[#da1a32]" />
              Ledger lines per month (quarter)
            </h2>
            <div className="mt-4 space-y-3">
              {ledgerLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : !pq ? (
                <p className="text-sm text-gray-500">Select a valid quarter.</p>
              ) : (
                monthlyRows.map((row) => (
                  <div key={row.month}>
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                      <span>{row.month}</span>
                      <span>
                        {row.count} line{row.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#edf2f4]">
                      <div
                        className="h-2.5 rounded-full bg-[#da1a32]"
                        style={{ width: `${(row.count / maxMonthly) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs text-gray-500">
                {pq
                  ? `Quarter: ${quarterLabel(pq.year, pq.q)} | Impact: ${impactArea} | Rows: ${filteredItems.length}`
                  : `Impact: ${impactArea} | Rows: ${filteredItems.length}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#da1a32]" />
          <h2 className="text-lg font-bold text-[#000000]">Generated ESG Archive</h2>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Snapshot uses the same filtered ledger as the charts above. Use <strong>Spreadsheet (.csv)</strong> for Excel
          (columns include SDG code, category, units, weight). Use <strong>ESG summary (.txt)</strong> for a short
          narrative: SDG list, totals, category split, and a line index.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] text-left text-gray-500">
                <th className="py-2 font-semibold">Report Name</th>
                <th className="py-2 font-semibold">Period</th>
                <th className="py-2 font-semibold">Primary SDG Focus</th>
                <th className="py-2 font-semibold">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {ledgerLoading ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : archiveRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">
                    No ledger activity in this quarter and filter — submit a bulk donation or widen the filter.
                  </td>
                </tr>
              ) : (
                archiveRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#edf2f4] last:border-b-0">
                    <td className="py-3 font-medium text-[#000000]">{row.name}</td>
                    <td className="py-3 text-gray-600">{row.period}</td>
                    <td className="py-3">
                      <span className="inline-block rounded-lg border border-[#e5e5e5] bg-[#edf2f4] px-2 py-1 text-xs text-[#000000]">
                        {row.sdgFocus}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={downloadArchiveLedgerCsv}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] px-2.5 py-1.5 text-xs transition-all hover:bg-[#edf2f4]"
                        >
                          <Download className="h-3.5 w-3.5 text-[#da1a32]" />
                          Spreadsheet (.csv)
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadArchiveEsgSummary(row.period)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] px-2.5 py-1.5 text-xs transition-all hover:bg-[#edf2f4]"
                        >
                          <Download className="h-3.5 w-3.5 text-[#da1a32]" />
                          ESG summary (.txt)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
