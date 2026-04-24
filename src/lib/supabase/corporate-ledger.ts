import type { SupabaseClient } from '@supabase/supabase-js';

/** Preserve PostgREST `code` / `details` — `error.message` alone is often incomplete. */
export function formatSupabasePostgrestError(error: {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}): string {
  const parts = [error.code, error.message, error.details, error.hint]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean);
  return parts.join(' | ') || 'Request failed';
}

export type LedgerStatus = 'pending' | 'completed' | 'delivered';

export type BulkDonationDetails = {
  assetCategory: string;
  itemDescription: string;
  totalUnits: string;
  estimatedWeightKg: string;
  assetCondition: string;
  pickupLocation: string;
  availablePickupDate: string;
  contactName: string;
  contactPhone: string;
  primaryImpactGoal: string;
  photoFileCount: number;
  /** Public URLs after upload to Supabase Storage (bucket corporate_bulk_donation_photos). */
  photoUrls?: string[];
};

export type LedgerItem = {
  id: string;
  /** ISO timestamp for ordering (DB + local fallback). */
  occurredAtIso?: string;
  dateLabel: string;
  activityType: string;
  amountOrQty: string;
  esgFocus: string;
  status: LedgerStatus;
  actionLabel: 'View Details' | 'View Receipt';
  notes?: string;
  bulkDetails?: BulkDonationDetails;
};

export type CorporateLedgerEntryRow = {
  id: string;
  corporate_partner_id: string;
  occurred_at: string;
  activity_type: string;
  amount_or_qty: string;
  esg_focus: string;
  status: LedgerStatus;
  notes: string | null;
  bulk_details: BulkDonationDetails | null;
};

export function assetConditionLabel(c: string): string {
  if (c === 'like_new') return 'Like New';
  if (c === 'gently_used') return 'Gently Used';
  if (c === 'minor_repair') return 'Needs Minor Repair';
  return c;
}

export function ledgerStatusLabel(s: LedgerStatus): string {
  if (s === 'pending') return 'Pending AI match';
  if (s === 'completed') return 'Completed';
  return 'Delivered';
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Units from bulk_details or parsed from amount_or_qty (e.g. "50 units"). */
export function parseBulkUnitsFromLedgerItem(item: LedgerItem): number {
  if (item.bulkDetails?.totalUnits) {
    const n = parseInt(String(item.bulkDetails.totalUnits).replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  const m = item.amountOrQty.match(/(\d[\d,]*)\s*units?/i);
  if (m) return parseInt(m[1].replace(/,/g, ''), 10) || 0;
  return 0;
}

/** Estimated weight (kg) from bulk submission snapshot. */
export function parseBulkWeightKgFromLedgerItem(item: LedgerItem): number {
  const raw = item.bulkDetails?.estimatedWeightKg?.trim();
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizeBulkDetailsFromRow(bulk: BulkDonationDetails | null): BulkDonationDetails | undefined {
  if (!bulk) return undefined;
  const ext = bulk as BulkDonationDetails & { photo_urls?: unknown };
  const fromCamel = Array.isArray(ext.photoUrls) ? ext.photoUrls.filter((u): u is string => typeof u === 'string' && u.length > 0) : [];
  const fromSnake =
    Array.isArray(ext.photo_urls) ? ext.photo_urls.filter((u): u is string => typeof u === 'string' && u.length > 0) : [];
  const photoUrls = fromCamel.length > 0 ? fromCamel : fromSnake;
  return {
    ...bulk,
    ...(photoUrls.length > 0 ? { photoUrls } : {}),
  };
}

export function mapCorporateLedgerRowToItem(row: CorporateLedgerEntryRow): LedgerItem {
  const actionLabel: LedgerItem['actionLabel'] = row.status === 'pending' ? 'View Details' : 'View Receipt';
  return {
    id: row.id,
    occurredAtIso: row.occurred_at,
    dateLabel: formatDateLabel(row.occurred_at),
    activityType: row.activity_type,
    amountOrQty: row.amount_or_qty,
    esgFocus: row.esg_focus,
    status: row.status,
    actionLabel,
    notes: row.notes ?? undefined,
    bulkDetails: normalizeBulkDetailsFromRow(row.bulk_details),
  };
}

export async function getCorporatePartnerIdForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ partnerId: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('corporate_partners')
    .select('id')
    .eq('owner_profile_id', userId)
    .maybeSingle();

  if (error) return { partnerId: null, error: new Error(formatSupabasePostgrestError(error)) };
  const row = data as { id: string } | null;
  return { partnerId: row?.id ?? null, error: null };
}

export async function fetchCorporateLedgerEntries(
  supabase: SupabaseClient,
  corporatePartnerId: string,
): Promise<{ items: LedgerItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('corporate_ledger_entries')
    .select(
      'id, corporate_partner_id, occurred_at, activity_type, amount_or_qty, esg_focus, status, notes, bulk_details',
    )
    .eq('corporate_partner_id', corporatePartnerId)
    .order('occurred_at', { ascending: false });

  if (error) return { items: [], error: new Error(formatSupabasePostgrestError(error)) };
  const rows = (data ?? []) as CorporateLedgerEntryRow[];
  return { items: rows.map(mapCorporateLedgerRowToItem), error: null };
}

export async function insertCorporateBulkLedgerEntry(
  supabase: SupabaseClient,
  corporatePartnerId: string,
  payload: {
    activityType: string;
    amountOrQty: string;
    esgFocus: string;
    notes: string;
    bulkDetails: BulkDonationDetails;
  },
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('corporate_ledger_entries').insert({
    corporate_partner_id: corporatePartnerId,
    activity_type: payload.activityType,
    amount_or_qty: payload.amountOrQty,
    esg_focus: payload.esgFocus,
    status: 'pending',
    notes: payload.notes || null,
    bulk_details: payload.bulkDetails,
  });

  if (error) return { error: new Error(formatSupabasePostgrestError(error)) };
  return { error: null };
}

const CORPORATE_BULK_PHOTO_BUCKET = 'corporate_bulk_donation_photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_FILES = 12;

/** Upload donation images; returns public URLs stored on the ledger row. */
export async function uploadCorporateBulkDonationPhotos(
  supabase: SupabaseClient,
  corporatePartnerId: string,
  files: File[],
): Promise<{ urls: string[]; error: Error | null }> {
  if (files.length === 0) return { urls: [], error: null };
  const slice = files.slice(0, MAX_PHOTO_FILES);
  const folder = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `u-${Date.now()}`;
  const urls: string[] = [];

  for (let i = 0; i < slice.length; i++) {
    const file = slice[i];
    if (!file.type.startsWith('image/')) {
      return { urls, error: new Error(`"${file.name}" is not an image file.`) };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { urls, error: new Error(`"${file.name}" exceeds ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`) };
    }
    const safe = (file.name || `photo-${i}`).replace(/[^\w.\-]+/g, '_').slice(0, 80);
    const path = `${corporatePartnerId}/${folder}/${i}-${safe}`;
    const { error: upErr } = await supabase.storage.from(CORPORATE_BULK_PHOTO_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (upErr) {
      const msg =
        typeof upErr === 'object' && upErr && 'message' in upErr && typeof (upErr as { message: string }).message === 'string'
          ? (upErr as { message: string }).message
          : String(upErr);
      return { urls, error: new Error(msg) };
    }
    const { data: pub } = supabase.storage.from(CORPORATE_BULK_PHOTO_BUCKET).getPublicUrl(path);
    if (pub?.publicUrl) urls.push(pub.publicUrl);
  }

  return { urls, error: null };
}

export function downloadLedgerReceiptText(item: LedgerItem): void {
  const receipt = [
    'Receipt',
    `Date: ${item.dateLabel}`,
    `Activity: ${item.activityType}`,
    `Amount/Qty: ${item.amountOrQty}`,
    `ESG Focus: ${item.esgFocus}`,
    `Status: ${item.status}`,
  ].join('\n');
  const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.id}-receipt.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** PostgREST has not reloaded metadata — the table may already exist in Postgres. */
export function isCorporateLedgerSchemaCacheIssue(combinedErrorText: string): boolean {
  const m = combinedErrorText.toLowerCase();
  return (
    m.includes('pgrst205') ||
    m.includes('pgrst204') ||
    (m.includes('schema cache') &&
      (m.includes('corporate_ledger_entries') || m.includes('corporate_ledger')))
  );
}

/** When PostgREST cannot read the ledger relation (missing table or not exposed to API). */
export function isCorporateLedgerTableUnavailableMessage(rawMessage: string): boolean {
  const m = rawMessage.toLowerCase();
  const mentionsLedger =
    m.includes('corporate_ledger_entries') || m.includes('corporate_ledger') || m.includes('pgrst205');
  if (!mentionsLedger) return false;
  return (
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    m.includes('relation') ||
    m.includes('could not find') ||
    m.includes('not found') ||
    m.includes('undefined_table') ||
    m.includes('42p01')
  );
}

/** User-facing text when the ledger SELECT fails (wrong project, stale cache, RLS, etc.). */
export function explainCorporateLedgerFetchFailure(combinedErrorText: string): string {
  const m = combinedErrorText.toLowerCase();

  if (m.includes('permission denied') || m.includes('42501')) {
    return [
      'The database denied read access to corporate_ledger_entries.',
      'Re-run the GRANT + RLS section in supabase/corporate_ledger_entries.sql in THIS Supabase project,',
      'and ensure policies can read corporate_partners for the EXISTS check.',
      '',
      `Technical: ${combinedErrorText}`,
    ].join('\n');
  }

  if (isCorporateLedgerSchemaCacheIssue(combinedErrorText)) {
    return [
      'Supabase returned a schema-cache error for corporate_ledger_entries even though the table may already exist in the Table Editor.',
      '',
      'Try in order:',
      '1) Supabase → Project Settings → API → reload the schema cache (or run in SQL Editor: NOTIFY pgrst, \'reload schema\';).',
      '2) Confirm this app uses the SAME project: .env NEXT_PUBLIC_SUPABASE_URL must match the dashboard URL (restart npm run dev after changes).',
      '3) If it still fails, run supabase/corporate_ledger_entries.sql in the SQL Editor for that project.',
      '',
      `Technical: ${combinedErrorText}`,
    ].join('\n');
  }

  if (isCorporateLedgerTableUnavailableMessage(combinedErrorText)) {
    return [
      'The REST API cannot read public.corporate_ledger_entries (table missing in this API project, wrong Supabase URL, or not exposed to PostgREST).',
      '',
      '1) Verify NEXT_PUBLIC_SUPABASE_URL in .env.local matches the project where you created the table.',
      '2) Run supabase/corporate_ledger_entries.sql in that project’s SQL Editor.',
      '3) Until the API works, new bulk donations are also kept in this browser (local fallback).',
      '',
      `Technical: ${combinedErrorText}`,
    ].join('\n');
  }

  return combinedErrorText;
}

export function explainCorporateLedgerError(rawMessage: string): string {
  return explainCorporateLedgerFetchFailure(rawMessage);
}

const LOCAL_LEDGER_PREFIX = 'corporate_ledger_fallback_v1:';

export function localCorporateLedgerStorageKey(partnerId: string): string {
  return `${LOCAL_LEDGER_PREFIX}${partnerId}`;
}

export function loadLocalCorporateLedger(partnerId: string): LedgerItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(localCorporateLedgerStorageKey(partnerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as LedgerItem[];
  } catch {
    return [];
  }
}

export function saveLocalCorporateLedger(partnerId: string, items: LedgerItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localCorporateLedgerStorageKey(partnerId), JSON.stringify(items));
  } catch {
    // quota exceeded — ignore
  }
}

export function sortLedgerItemsDesc(items: LedgerItem[]): LedgerItem[] {
  return [...items].sort((a, b) => {
    const ta = a.occurredAtIso ?? '';
    const tb = b.occurredAtIso ?? '';
    if (tb !== ta) return tb.localeCompare(ta);
    return b.id.localeCompare(a.id);
  });
}

/** DB rows plus local-only rows (same partner) so offline-first entries survive after the table is created. */
export function mergeDbAndLocalLedger(dbItems: LedgerItem[], localItems: LedgerItem[]): LedgerItem[] {
  const dbIds = new Set(dbItems.map((x) => x.id));
  const onlyLocal = localItems.filter((x) => !dbIds.has(x.id));
  return sortLedgerItemsDesc([...dbItems, ...onlyLocal]);
}

/** Drop local copies of rows that now exist in Supabase (same id). */
export function pruneLocalCorporateLedgerAgainstDb(partnerId: string, dbItems: LedgerItem[]): void {
  const dbIds = new Set(dbItems.map((x) => x.id));
  const local = loadLocalCorporateLedger(partnerId);
  const pruned = local.filter((x) => !dbIds.has(x.id));
  saveLocalCorporateLedger(partnerId, pruned);
}

export function appendLocalCorporateBulkDonation(
  partnerId: string,
  row: {
    activityType: string;
    amountOrQty: string;
    esgFocus: string;
    notes: string;
    bulkDetails: BulkDonationDetails;
  },
): LedgerItem[] {
  const prev = loadLocalCorporateLedger(partnerId);
  const now = new Date();
  const occurredAtIso = now.toISOString();
  const dateLabel = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${Date.now()}`;
  const newItem: LedgerItem = {
    id,
    occurredAtIso,
    dateLabel,
    activityType: row.activityType,
    amountOrQty: row.amountOrQty,
    esgFocus: row.esgFocus,
    status: 'pending',
    actionLabel: 'View Details',
    notes: row.notes,
    bulkDetails: row.bulkDetails,
  };
  const next = sortLedgerItemsDesc([newItem, ...prev]);
  saveLocalCorporateLedger(partnerId, next);
  return next;
}
