import type { ItemCondition, PlanReceiver } from '@/app/lib/donation-plan-types';
import { getSupabaseServerClientOrNull } from '@/lib/supabase/server';

type LiveNeedJoin = {
  id: string;
  title: string;
  description: string;
  category: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  urgency: 'low' | 'medium' | 'high';
  is_emergency: boolean;
  disaster_event_id: string | null;
  disaster_events:
    | {
        id: string;
        title: string;
        disaster_type: string;
        status: string;
        severity: string;
      }
    | {
        id: string;
        title: string;
        disaster_type: string;
        status: string;
        severity: string;
      }[]
    | null;
  organizations:
    | {
        id: string;
        name: string;
        address: string | null;
        location_name: string | null;
        is_emergency: boolean;
        emergency_reason: string | null;
        organization_type: string | null;
      }
    | {
        id: string;
        name: string;
        address: string | null;
        location_name: string | null;
        is_emergency: boolean;
        emergency_reason: string | null;
        organization_type: string | null;
      }[]
    | null;
};

type OrgMatch = {
  needId: string;
  organizationId: string;
  organizationName: string;
  location: string;
  urgency: 'High' | 'Medium' | 'Low';
  score: number;
  reason: string[];
  needTitle: string;
  needDescription: string;
  category: string;
  remainingQuantity: number;
  isEmergency: boolean;
  disasterEventTitle: string | null;
  disasterEventType: string | null;
  disasterEventStatus: string | null;
  disasterSeverity: string | null;
};

export interface LiveNeedMatchCandidate {
  needId: string;
  organizationId: string;
  organizationName: string;
  location: string;
  urgency: 'High' | 'Medium' | 'Low';
  score: number;
  reason: string[];
  category: string;
  needTitle: string;
  needDescription: string;
  remainingQuantity: number;
  isEmergency: boolean;
  disasterEventTitle: string | null;
  disasterEventType: string | null;
  disasterEventStatus: string | null;
  disasterSeverity: string | null;
}

function normalizeText(blob: string) {
  return blob.toLowerCase();
}

function getRemainingQuantity(quantityRequested: number, quantityFulfilled: number) {
  return Math.max(0, quantityRequested - quantityFulfilled);
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function mapUrgency(urgency: 'low' | 'medium' | 'high', isEmergency: boolean): 'High' | 'Medium' | 'Low' {
  if (isEmergency || urgency === 'high') return 'High';
  if (urgency === 'medium') return 'Medium';
  return 'Low';
}

function pickDistinctOrgPair(matches: OrgMatch[]): OrgMatch[] {
  const out: OrgMatch[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    if (seen.has(match.organizationId)) continue;
    seen.add(match.organizationId);
    out.push(match);
    if (out.length === 2) break;
  }
  return out;
}

function allocatePercents(matches: OrgMatch[]): number[] {
  if (matches.length <= 1) return [100];
  const total = matches.reduce((sum, match) => sum + Math.max(0.01, match.score), 0);
  const first = Math.round((matches[0].score / total) * 100);
  const safeFirst = Math.min(80, Math.max(55, first));
  return [safeFirst, 100 - safeFirst];
}

function scoreNeedForDonation(row: LiveNeedJoin, blob: string, condition?: ItemCondition): OrgMatch | null {
  const org = asArray(row.organizations)[0];
  const event = asArray(row.disaster_events)[0];
  if (!org) return null;

  const combined = normalizeText(
    `${row.title} ${row.description} ${row.category} ${org.name} ${org.organization_type ?? ''} ${
      org.emergency_reason ?? ''
    } ${event?.title ?? ''} ${event?.disaster_type ?? ''}`,
  );

  let score = 0;
  const remaining = getRemainingQuantity(row.quantity_requested, row.quantity_fulfilled);
  score += Math.min(18, remaining / 10);
  score += row.urgency === 'high' ? 12 : row.urgency === 'medium' ? 7 : 3;
  if (row.is_emergency || org.is_emergency) score += 12;
  if (event?.status === 'active') score += 10;
  if (event?.severity === 'high') score += 4;

  const keywords = blob.split(/\s+/).filter(Boolean);
  for (const keyword of keywords) {
    if (keyword.length < 3) continue;
    if (combined.includes(keyword)) score += 2.2;
  }

  if (/\bfood|rice|meal|canned|water|ration\b/.test(blob) && /food|rice|water|ration/.test(combined)) score += 12;
  if (/\bblanket|bedding|mattress|sleep\b/.test(blob) && /blanket|bedding|shelter|sleep/.test(combined)) score += 10;
  if (/\bmedical|medicine|mask|health|hygiene|soap|sanitary|diaper\b/.test(blob) && /medical|hygiene|diaper|sanitary|soap|clinic/.test(combined)) score += 12;
  if (/\bbook|school|education|stationery|kit\b/.test(blob) && /book|school|education|stationery|kit/.test(combined)) score += 10;
  if (/\bcloth|clothes|shirt|jacket|wear|shoe\b/.test(blob) && /cloth|shirt|wear|apparel|blanket/.test(combined)) score += 10;

  if (condition === 'Worn' && /medical|baby formula|sterile/.test(combined)) score -= 5;
  if (condition === 'Damaged') score -= 20;

  const location = org.location_name?.trim() || org.address?.trim() || 'Location on file';
  const urgency = mapUrgency(row.urgency, row.is_emergency || org.is_emergency);
  const eventLabel = event?.title ? `Linked to ${event.title}.` : 'Live active need.';

  return {
    needId: row.id,
    organizationId: org.id,
    organizationName: org.name,
    location,
    urgency,
    score,
    reason: [
      `${row.title} still needs ${remaining} units (${row.category}).`,
      eventLabel,
      org.emergency_reason?.trim() || row.description.slice(0, 120) || 'Matched against live receiver demand.',
    ],
    needTitle: row.title,
    needDescription: row.description,
    category: row.category,
    remainingQuantity: remaining,
    isEmergency: row.is_emergency || org.is_emergency,
    disasterEventTitle: event?.title ?? null,
    disasterEventType: event?.disaster_type ?? null,
    disasterEventStatus: event?.status ?? null,
    disasterSeverity: event?.severity ?? null,
  };
}

function toLiveNeedCandidate(match: OrgMatch): LiveNeedMatchCandidate {
  return {
    needId: match.needId,
    organizationId: match.organizationId,
    organizationName: match.organizationName,
    location: match.location,
    urgency: match.urgency,
    score: match.score,
    reason: match.reason,
    category: match.category,
    needTitle: match.needTitle,
    needDescription: match.needDescription,
    remainingQuantity: match.remainingQuantity,
    isEmergency: match.isEmergency,
    disasterEventTitle: match.disasterEventTitle,
    disasterEventType: match.disasterEventType,
    disasterEventStatus: match.disasterEventStatus,
    disasterSeverity: match.disasterSeverity,
  };
}

export async function getLiveNeedMatchCandidates(
  transcript: string,
  detectedItem: string,
  condition?: ItemCondition,
  limit = 8,
): Promise<LiveNeedMatchCandidate[] | null> {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('needs')
    .select(
      `
      id,
      title,
      description,
      category,
      quantity_requested,
      quantity_fulfilled,
      urgency,
      is_emergency,
      disaster_event_id,
      organizations!inner (
        id,
        name,
        address,
        location_name,
        is_emergency,
        emergency_reason,
        organization_type
      ),
      disaster_events (
        id,
        title,
        disaster_type,
        status,
        severity
      )
    `,
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error || !data?.length) return null;

  const blob = normalizeText(`${transcript} ${detectedItem}`);
  const scored: OrgMatch[] = (data as LiveNeedJoin[])
    .map((row) => scoreNeedForDonation(row, blob, condition))
    .filter((row): row is OrgMatch => row !== null)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  return scored.slice(0, Math.max(1, limit)).map(toLiveNeedCandidate);
}

export async function getLiveMatchedReceivers(
  transcript: string,
  detectedItem: string,
  condition?: ItemCondition,
): Promise<PlanReceiver[] | null> {
  const scored = await getLiveNeedMatchCandidates(transcript, detectedItem, condition, 12);
  if (!scored?.length) return null;

  const matches = pickDistinctOrgPair(scored);
  const percents = allocatePercents(matches);

  return matches.map((match, index) => ({
    ngoId: match.needId,
    name: match.organizationName,
    location: match.location,
    allocation: percents[index] ?? 100,
    percent: percents[index] ?? 100,
    urgency: match.urgency,
    reason: match.reason,
    matchContext: 'in_kind',
  }));
}
