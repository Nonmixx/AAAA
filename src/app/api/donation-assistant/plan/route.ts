/**
 * Z.AI GLM allocation planner (server-only).
 *
 * Env:
 *   ZAI_API_KEY or BIGMODEL_API_KEY — required for live GLM; if unset, returns catalog-grounded fallback.
 *   ZAI_API_BASE — default https://open.bigmodel.cn/api/paas/v4 (set to your Z.AI OpenAI-compatible base if different).
 *   GLM_MODEL — default glm-4-flash (e.g. glm-4, glm-4-air).
 */
import { NextResponse } from 'next/server';
import { NGO_DEMAND_CATALOG, getNgoById } from '../../../lib/ngos-demand-catalog';
import { getTopMatchedReceivers } from '../../../lib/match-donation-ngos';
import type { DonationPlanPayload, PlanReceiver, PlanRequestBody } from '../../../lib/donation-plan-types';
import { buildWorkflowOrchestrationPromptSection } from '../../../lib/donation-assistant-workflow';
import {
  getAnthropicModel,
  getGlmModel,
  getZaiApiKey,
  getZaiCandidateBases,
  isAnthropicCompatibleBase,
} from '../../../lib/zai-env';

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

function buildFallbackPlan(body: PlanRequestBody): DonationPlanPayload {
  const receivers = getTopMatchedReceivers(body.transcript, body.detectedItem, body.condition);
  const a = NGO_DEMAND_CATALOG.find((n) => n.id === receivers[0].ngoId)!;
  const b = NGO_DEMAND_CATALOG.find((n) => n.id === receivers[1].ngoId)!;
  return {
    donorIntent: `Donor wants to contribute ${body.detectedItem}. Chat context suggests practical donation logistics and condition ${body.condition}.`,
    ngoDemandCheck: `Compared your item to live catalog gaps (food, clothing, medical, shelter). Top matches: ${a.name}, ${b.name}.`,
    urgencyEvaluation: `Prioritized NGOs with higher needLevel and urgencyLabel aligned to item category keywords in the transcript.`,
    planSummary: `Split ${receivers[0].allocation}/${receivers[1].allocation} between the two strongest catalog matches while demand signals remain dynamic.`,
    receivers,
    model: 'local-heuristic',
    source: 'fallback',
  };
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

  const apiKey = getZaiApiKey();
  if (!apiKey) {
    const fallback = buildFallbackPlan(body);
    return NextResponse.json(fallback);
  }

  const model = getGlmModel();
  const anthropicModel = getAnthropicModel();
  const baseCandidates = getZaiCandidateBases();

  const catalogJson = JSON.stringify(NGO_DEMAND_CATALOG, null, 2);

  const system = `${buildWorkflowOrchestrationPromptSection('plan')}

You are DonateAI's allocation engine using Z.AI GLM. You must:
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

  const user = `CATALOG_JSON:\n${catalogJson}\n\nDONATION_ITEM: ${body.detectedItem}\nCONDITION: ${body.condition}\n\nCHAT_TRANSCRIPT:\n${body.transcript}`;

  try {
    let res: Response | null = null;
    for (const base of baseCandidates) {
      const anthropic = isAnthropicCompatibleBase(base);
      const url = anthropic ? `${base}/v1/messages` : `${base}/chat/completions`;
      const headerCandidates = anthropic
        ? [
            {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            {
              Authorization: `Bearer ${apiKey}`,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
          ]
        : [
            { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            { 'api-key': apiKey, 'Content-Type': 'application/json' },
          ];
      for (const headers of headerCandidates) {
        const payload = anthropic
          ? {
              model: anthropicModel,
              max_tokens: 1200,
              temperature: 0.35,
              system,
              messages: [{ role: 'user', content: user }],
            }
          : {
              model,
              temperature: 0.35,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
              ],
            };
        const candidate = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (candidate.ok) {
          res = candidate;
          break;
        }
        if (candidate.status !== 401 && candidate.status !== 404) {
          res = candidate;
          break;
        }
      }
      if (res) break;
    }
    if (!res) return NextResponse.json(buildFallbackPlan(body));

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('GLM API error', res.status, errText);
      return NextResponse.json(buildFallbackPlan(body));
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      content?: { type?: string; text?: string }[];
    };
    const content = data.choices?.[0]?.message?.content || data.content?.find((c) => c.type === 'text')?.text;
    if (!content) {
      return NextResponse.json(buildFallbackPlan(body));
    }

    const parsed = extractJsonObject(content);
    const { rows, donorIntent, ngoDemandCheck, urgencyEvaluation, planSummary } = parseGlmAllocation(parsed);
    const validRows = rows.filter((r) => getNgoById(r.ngoId));
    if (validRows.length === 0) {
      return NextResponse.json(buildFallbackPlan(body));
    }
    const percentMap = normalizePercents(validRows.map((r) => ({ ngoId: r.ngoId, percent: r.percent })));
    const receivers = toReceivers(validRows, percentMap);

    const payload: DonationPlanPayload = {
      donorIntent: donorIntent || 'Intent inferred from transcript and item category.',
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
    return NextResponse.json(buildFallbackPlan(body));
  }
}
