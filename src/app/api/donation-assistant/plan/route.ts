/**
 * Z.AI GLM allocation planner (server-only).
 *
 * Env:
 *   ZAI_API_KEY or BIGMODEL_API_KEY — required for live GLM; if unset, returns catalog-grounded fallback.
 *   ZAI_API_BASE — default https://open.bigmodel.cn/api/paas/v4 (set to your Z.AI OpenAI-compatible base if different).
 *   GLM_MODEL — default ilmu-glm-5.1.
 */
import { NextResponse } from 'next/server';
import { NGO_DEMAND_CATALOG, getNgoById } from '../../../lib/ngos-demand-catalog';
import { getTopMatchedReceivers } from '../../../lib/match-donation-ngos';
import type { DeliveryPreference, DonationPlanPayload, PlanReceiver, PlanRequestBody } from '../../../lib/donation-plan-types';
import { getLiveMatchedReceivers, getLiveNeedMatchCandidates, type LiveNeedMatchCandidate } from '@/lib/disaster/liveDonationMatching';

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const DEFAULT_MODEL = 'ilmu-glm-5.1';

function deliveryPreferenceLabel(preference?: DeliveryPreference): string {
  return preference === 'self_delivery' ? 'Self delivery' : 'Platform delivery';
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

function normalizePercents(rows: { ngoId: string; percent: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const p = Number.isFinite(r.percent) ? Math.max(0, r.percent) : 0;
    map.set(r.ngoId, (map.get(r.ngoId) ?? 0) + p);
  }
  let sum = [...map.values()].reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const top = NGO_DEMAND_CATALOG.slice(0, 2);
    top.forEach((n, i) => map.set(n.id, i === 0 ? 60 : 40));
    sum = 100;
  }
  if (Math.abs(sum - 100) > 0.5) {
    const factor = 100 / sum;
    for (const k of map.keys()) {
      map.set(k, Math.round((map.get(k)! * factor + Number.EPSILON) * 10) / 10);
    }
    let adj = [...map.values()].reduce((a, b) => a + b, 0);
    const diff = Math.round((100 - adj) * 10) / 10;
    if (diff !== 0 && map.size > 0) {
      const first = [...map.keys()][0];
      map.set(first, Math.round((map.get(first)! + diff) * 10) / 10);
    }
  }
  return map;
}

function buildCatalogFallbackPlan(body: PlanRequestBody): DonationPlanPayload {
  const receivers = getTopMatchedReceivers(body.transcript, body.detectedItem, body.condition);
  const a = NGO_DEMAND_CATALOG.find((n) => n.id === receivers[0].ngoId)!;
  const b = NGO_DEMAND_CATALOG.find((n) => n.id === receivers[1].ngoId)!;
  return {
    donorIntent: `Donor wants to contribute ${body.detectedItem}. Chat context suggests practical donation logistics, ${deliveryPreferenceLabel(body.deliveryPreference).toLowerCase()}, and condition ${body.condition}.`,
    ngoDemandCheck: `Compared your item to live catalog gaps (food, clothing, medical, shelter). Top matches: ${a.name}, ${b.name}.`,
    urgencyEvaluation: `Prioritized NGOs with higher needLevel and urgencyLabel aligned to item category keywords in the transcript.`,
    planSummary: `Split ${receivers[0].allocation}/${receivers[1].allocation} between the two strongest catalog matches while honoring the donor's ${deliveryPreferenceLabel(body.deliveryPreference).toLowerCase()} preference.`,
    receivers,
    model: 'local-heuristic',
    source: 'fallback',
  };
}

async function buildFallbackPlan(body: PlanRequestBody): Promise<DonationPlanPayload> {
  const liveReceivers = await getLiveMatchedReceivers(body.transcript, body.detectedItem, body.condition);
  if (liveReceivers?.length) {
    const summaryNames = liveReceivers.map((receiver) => receiver.name).join(', ');
    return {
      donorIntent: `Donor wants to contribute ${body.detectedItem}. Current transcript suggests an in-kind donation in ${body.condition} condition with ${deliveryPreferenceLabel(body.deliveryPreference).toLowerCase()} selected.`,
      ngoDemandCheck: `Matched against live active needs in Supabase. Top receiver organizations: ${summaryNames}.`,
      urgencyEvaluation: `Prioritized needs with active emergency tags, larger remaining quantities, and disaster-linked requests when available.`,
      planSummary:
        liveReceivers.length > 1
          ? `Split across the two strongest live needs so urgent relief stays balanced while respecting the donor's delivery preference.`
          : `Route this donation to the strongest live need currently available while respecting the donor's delivery preference.`,
      receivers: liveReceivers,
      model: 'live-heuristic',
      source: 'fallback',
    };
  }

  return buildCatalogFallbackPlan(body);
}

function parseGlmAllocation(raw: unknown): { rows: { ngoId: string; percent: number; urgency: string; reasoningBullets: string[] }[]; donorIntent: string; ngoDemandCheck: string; urgencyEvaluation: string; planSummary: string } {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON root');
  const o = raw as Record<string, unknown>;
  const donorIntent = typeof o.donorIntent === 'string' ? o.donorIntent : '';
  const ngoDemandCheck = typeof o.ngoDemandCheck === 'string' ? o.ngoDemandCheck : '';
  const urgencyEvaluation = typeof o.urgencyEvaluation === 'string' ? o.urgencyEvaluation : '';
  const planSummary = typeof o.planSummary === 'string' ? o.planSummary : '';
  const allocation = o.allocation;
  if (!Array.isArray(allocation)) throw new Error('Missing allocation array');
  const rows = allocation.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid allocation row');
    const r = item as Record<string, unknown>;
    const ngoId = typeof r.ngoId === 'string' ? r.ngoId : '';
    const percentRaw = typeof r.percent === 'number' ? r.percent : Number(String(r.percent));
    const percent = Number.isFinite(percentRaw) ? percentRaw : 0;
    const urgency = typeof r.urgency === 'string' ? r.urgency : 'Medium';
    const bullets = Array.isArray(r.reasoningBullets)
      ? r.reasoningBullets.filter((x): x is string => typeof x === 'string')
      : [];
    return { ngoId, percent, urgency, reasoningBullets: bullets };
  });
  return { rows, donorIntent, ngoDemandCheck, urgencyEvaluation, planSummary };
}

function parseGlmNeedAllocation(raw: unknown): {
  rows: { needId: string; percent: number; urgency: string; reasoningBullets: string[] }[];
  donorIntent: string;
  ngoDemandCheck: string;
  urgencyEvaluation: string;
  planSummary: string;
} {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON root');
  const o = raw as Record<string, unknown>;
  const donorIntent = typeof o.donorIntent === 'string' ? o.donorIntent : '';
  const ngoDemandCheck = typeof o.ngoDemandCheck === 'string' ? o.ngoDemandCheck : '';
  const urgencyEvaluation = typeof o.urgencyEvaluation === 'string' ? o.urgencyEvaluation : '';
  const planSummary = typeof o.planSummary === 'string' ? o.planSummary : '';
  const allocation = o.allocation;
  if (!Array.isArray(allocation)) throw new Error('Missing allocation array');
  const rows = allocation.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid allocation row');
    const r = item as Record<string, unknown>;
    const needId = typeof r.needId === 'string' ? r.needId : '';
    const percentRaw = typeof r.percent === 'number' ? r.percent : Number(String(r.percent));
    const percent = Number.isFinite(percentRaw) ? percentRaw : 0;
    const urgency = typeof r.urgency === 'string' ? r.urgency : 'Medium';
    const bullets = Array.isArray(r.reasoningBullets)
      ? r.reasoningBullets.filter((x): x is string => typeof x === 'string')
      : [];
    return { needId, percent, urgency, reasoningBullets: bullets };
  });
  return { rows, donorIntent, ngoDemandCheck, urgencyEvaluation, planSummary };
}

function toReceivers(
  rows: { ngoId: string; percent: number; urgency: string; reasoningBullets: string[] }[],
  percentMap: Map<string, number>,
): PlanReceiver[] {
  const out: PlanReceiver[] = [];
  for (const row of rows) {
    const n = getNgoById(row.ngoId);
    if (!n) continue;
    const pct = Math.round(percentMap.get(row.ngoId) ?? row.percent);
    const u = row.urgency === 'High' || row.urgency === 'Low' ? row.urgency : 'Medium';
    const urgency: PlanReceiver['urgency'] = u === 'High' || u === 'Low' ? u : 'Medium';
    const reason =
      row.reasoningBullets.length > 0
        ? row.reasoningBullets
        : [`Matched ${n.name} to catalog demand: ${n.currentGap}`];
    out.push({
      ngoId: n.id,
      name: n.name,
      location: n.location,
      allocation: pct,
      percent: pct,
      urgency,
      reason,
    });
  }
  if (out.length === 0) throw new Error('No valid NGO ids in allocation');
  return out;
}

function toLiveNeedReceivers(
  rows: { needId: string; percent: number; urgency: string; reasoningBullets: string[] }[],
  percentMap: Map<string, number>,
  candidates: LiveNeedMatchCandidate[],
): PlanReceiver[] {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.needId, candidate] as const));
  const out: PlanReceiver[] = [];
  for (const row of rows) {
    const candidate = candidateMap.get(row.needId);
    if (!candidate) continue;
    const pct = Math.round(percentMap.get(row.needId) ?? row.percent);
    const u = row.urgency === 'High' || row.urgency === 'Low' ? row.urgency : 'Medium';
    out.push({
      ngoId: candidate.needId,
      name: candidate.organizationName,
      location: candidate.location,
      allocation: pct,
      percent: pct,
      urgency: u === 'High' || u === 'Low' ? u : 'Medium',
      reason:
        row.reasoningBullets.length > 0
          ? row.reasoningBullets
          : [
              `${candidate.needTitle} still needs ${candidate.remainingQuantity} units (${candidate.category}).`,
              candidate.disasterEventTitle ? `Linked to ${candidate.disasterEventTitle}.` : 'Live active need.',
              candidate.reason[2] || 'Matched against live receiver demand.',
            ],
      matchContext: 'in_kind',
    });
  }
  if (out.length === 0) throw new Error('No valid live need ids in allocation');
  return out;
}

export async function POST(req: Request) {
  let body: PlanRequestBody;
  try {
    body = (await req.json()) as PlanRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.transcript || !body.detectedItem || !body.condition) {
    return NextResponse.json({ error: 'transcript, detectedItem, and condition are required' }, { status: 400 });
  }

  const apiKey = process.env.ZAI_API_KEY?.trim() || process.env.BIGMODEL_API_KEY?.trim();
  if (!apiKey) {
    const fallback = await buildFallbackPlan(body);
    return NextResponse.json(fallback);
  }

  const base = (process.env.ZAI_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.GLM_MODEL?.trim() || DEFAULT_MODEL;
  const url = `${base}/chat/completions`;
  const liveCandidates = await getLiveNeedMatchCandidates(body.transcript, body.detectedItem, body.condition, 8);

  if (liveCandidates?.length) {
    const needsJson = JSON.stringify(
      liveCandidates.map((candidate) => ({
        needId: candidate.needId,
        organizationId: candidate.organizationId,
        organizationName: candidate.organizationName,
        location: candidate.location,
        category: candidate.category,
        needTitle: candidate.needTitle,
        needDescription: candidate.needDescription,
        remainingQuantity: candidate.remainingQuantity,
        urgency: candidate.urgency,
        isEmergency: candidate.isEmergency,
        disasterEventTitle: candidate.disasterEventTitle,
        disasterEventType: candidate.disasterEventType,
        disasterEventStatus: candidate.disasterEventStatus,
        disasterSeverity: candidate.disasterSeverity,
        heuristicScore: Math.round(candidate.score * 10) / 10,
        hints: candidate.reason,
      })),
      null,
      2,
    );

    const system = `You are DonateAI's allocation engine using Z.AI GLM.
You must search and reason over the provided live Supabase needs only.

Tasks:
1) Infer donor intent from the transcript, item, and condition.
2) Evaluate which live needs best fit the donation item.
3) Weight urgency using remaining quantity, emergency flags, and linked disaster event context.
4) Propose a percentage split across 1-4 distinct needId values that sums to 100.
5) Give concise reasoning bullets per allocated live need. Explainability is mandatory.
6) Respect the donor's delivery preference when discussing logistics.

Output a single JSON object (no markdown) with keys:
donorIntent (string, 1-3 sentences)
ngoDemandCheck (string, 2-4 sentences referencing specific organizations / needs)
urgencyEvaluation (string, 2-3 sentences)
allocation (array of { needId, percent, urgency: "High"|"Medium"|"Low", reasoningBullets: string[] })
planSummary (string, one sentence)

Reasoning bullets (per allocation row):
- Include why this live need fits the donor item, condition, and urgency.
- Include exactly one bullet that starts with the prefix "**Why this share:**" and states why that integer percent fits relative priority versus the other selected rows.
- Optional extra bullets may mention disaster context, logistics, or suitability constraints.
- If the donor chose self delivery, use drop-off or self handoff wording.
- If the donor chose platform delivery, use platform-coordinated delivery wording without promising guaranteed pickup times.

Rules:
- Use only needId values present in the provided live needs JSON.
- Percents must be integers summing to 100.
- Keep recommendations grounded in the live Supabase needs; do not invent unavailable needs.`;

    const user = `LIVE_NEEDS_JSON:\n${needsJson}\n\nDONATION_ITEM: ${body.detectedItem}\nCONDITION: ${body.condition}\nDELIVERY_PREFERENCE: ${deliveryPreferenceLabel(body.deliveryPreference)}\n\nCHAT_TRANSCRIPT:\n${body.transcript}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('GLM live needs API error', res.status, errText);
        return NextResponse.json(await buildFallbackPlan(body));
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return NextResponse.json(await buildFallbackPlan(body));
      }

      const parsed = extractJsonObject(content);
      const { rows, donorIntent, ngoDemandCheck, urgencyEvaluation, planSummary } = parseGlmNeedAllocation(parsed);
      const validRows = rows.filter((row) => liveCandidates.some((candidate) => candidate.needId === row.needId));
      if (validRows.length === 0) {
        return NextResponse.json(await buildFallbackPlan(body));
      }
      const percentMap = normalizePercents(validRows.map((row) => ({ ngoId: row.needId, percent: row.percent })));
      const receivers = toLiveNeedReceivers(validRows, percentMap, liveCandidates);

      const payload: DonationPlanPayload = {
        donorIntent: donorIntent || `Intent inferred from transcript, item category, and ${deliveryPreferenceLabel(body.deliveryPreference).toLowerCase()} preference.`,
        ngoDemandCheck: ngoDemandCheck || 'Demand cross-check completed against live Supabase needs.',
        urgencyEvaluation: urgencyEvaluation || 'Urgency ranked using active need quantities, emergency tags, and disaster context.',
        planSummary: planSummary || 'Allocation optimized across matched live needs.',
        receivers,
        model,
        source: 'glm',
      };
      return NextResponse.json(payload);
    } catch (e) {
      console.error('donation-assistant/plan live-needs', e);
      return NextResponse.json(await buildFallbackPlan(body));
    }
  }

  const catalogJson = JSON.stringify(NGO_DEMAND_CATALOG, null, 2);

  const system = `You are DonateAI's allocation engine using Z.AI GLM. You must:
1) Infer donor intent from the transcript and item.
2) Cross-check each NGO in the catalog ONLY (by id) — describe demand fit honestly.
3) Evaluate relative urgency using needLevel, urgencyLabel, and currentGap.
4) Propose a percentage split across 2–4 distinct ngoIds that sums to 100.
5) Give concise reasoning bullets per allocated NGO. Explainability is mandatory (see below).

Output a single JSON object (no markdown) with keys:
donorIntent (string, 1–3 sentences)
ngoDemandCheck (string, 2–4 sentences referencing specific NGOs by name)
urgencyEvaluation (string, 2–3 sentences)
allocation (array of { ngoId, percent, urgency: "High"|"Medium"|"Low", reasoningBullets: string[] })
planSummary (string, one sentence)

Reasoning bullets (per NGO row in allocation):
- Include **why this NGO / case** for this donor (catalog gaps, categories, urgency vs item).
- Include **exactly one** bullet that starts with the prefix "**Why this share:**" and states why that integer **percent** (not another split) fits the donor's item, condition, and relative priority vs other rows.
- Optional extra bullets for logistics or risk notes.

Rules: Use only ngoId values present in the provided catalog. Percents must be integers summing to 100.`;

  const user = `CATALOG_JSON:\n${catalogJson}\n\nDONATION_ITEM: ${body.detectedItem}\nCONDITION: ${body.condition}\nDELIVERY_PREFERENCE: ${deliveryPreferenceLabel(body.deliveryPreference)}\n\nCHAT_TRANSCRIPT:\n${body.transcript}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('GLM API error', res.status, errText);
      return NextResponse.json(await buildFallbackPlan(body));
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(await buildFallbackPlan(body));
    }

    const parsed = extractJsonObject(content);
    const { rows, donorIntent, ngoDemandCheck, urgencyEvaluation, planSummary } = parseGlmAllocation(parsed);
    const validRows = rows.filter((r) => getNgoById(r.ngoId));
    if (validRows.length === 0) {
      return NextResponse.json(await buildFallbackPlan(body));
    }
    const percentMap = normalizePercents(validRows.map((r) => ({ ngoId: r.ngoId, percent: r.percent })));
    const receivers = toReceivers(validRows, percentMap);

    const payload: DonationPlanPayload = {
      donorIntent: donorIntent || `Intent inferred from transcript, item category, and ${deliveryPreferenceLabel(body.deliveryPreference).toLowerCase()} preference.`,
      ngoDemandCheck: ngoDemandCheck || 'Demand cross-check completed against catalog.',
      urgencyEvaluation: urgencyEvaluation || 'Urgency ranked using catalog needLevel and stated gaps.',
      planSummary: planSummary || 'Allocation optimized across matched NGOs.',
      receivers,
      model,
      source: 'glm',
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error('donation-assistant/plan', e);
    return NextResponse.json(await buildFallbackPlan(body));
  }
}
