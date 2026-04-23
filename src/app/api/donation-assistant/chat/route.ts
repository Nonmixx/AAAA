import { NextResponse } from 'next/server';
import { NGO_DEMAND_CATALOG } from '../../../lib/ngos-demand-catalog';
import { getTopMatchedReceivers } from '../../../lib/match-donation-ngos';
import type { PlanReceiver } from '../../../lib/donation-plan-types';

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const DEFAULT_MODEL = 'glm-4-flash';

type ApiMsg = { role: 'user' | 'assistant'; content: string };

interface ChatBody {
  messages: ApiMsg[];
  stage: string;
  detectedItem: string;
  userLatest?: string;
}

function lastUserContent(messages: ApiMsg[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

function chatContextTranscript(messages: ApiMsg[], userLatest: string, detectedItem: string): string {
  const recentUsers = messages
    .filter((m) => m.role === 'user')
    .slice(-8)
    .map((m) => m.content.trim())
    .filter(Boolean);
  const tail = recentUsers.length ? recentUsers.join('\n') : userLatest;
  return `${tail}\n[Detected category: ${detectedItem}]`;
}

function appendMatchedAgentsHint(reply: string, agents: PlanReceiver[]): string {
  const [a, b] = agents;
  if (!a) return reply;
  if (!b || a.ngoId === b.ngoId) {
    return `${reply}\n\n**Matched donation agents:** ${a.name} (${a.percent}%) — suggested item-donation routing for this demo catalog.`;
  }
  return `${reply}\n\n**Matched donation agents:** ${a.name} (${a.percent}%) · ${b.name} (${b.percent}%) — suggested item-donation routing for this demo catalog.`;
}

function jsonSafeMatchedAgents(agents: PlanReceiver[]) {
  return agents.map((r) => ({
    name: r.name,
    ngoId: r.ngoId,
    allocationPercent: r.percent,
    urgency: r.urgency,
    location: r.location,
    reasons: r.reason,
    matchContext: r.matchContext,
  }));
}

function fallbackReply(stage: string, detectedItem: string): string {
  const ngos = NGO_DEMAND_CATALOG.map((n) => n.name).join(', ');

  if (stage === 'greeting') {
    return `Hi! I can help you donate **physical items** and match them to NGO demand. Tell me what items you want to donate (e.g. clothing, food packs, books), and your area. Partners include: ${ngos}.`;
  }
  if (stage === 'details') {
    return `Thanks — I’ve noted your donation focus as “${detectedItem}”.\n\nTo proceed with item donation, please share:\n• Rough quantity or number of boxes\n• Pickup or drop-off area\n• Timing constraints\n\nWhen ready, upload a clear item photo and press **Send** (nothing is uploaded until Send).`;
  }
  if (stage === 'awaiting_image') {
    return `I’m ready to screen **item condition** once I have a photo.\n\n1) Tap the image button and select one clear photo.\n2) Add an optional caption.\n3) Press **Send** to run analysis.\n\nNeed guidance? I can suggest suitable NGOs after screening.`;
  }
  return 'How can I help with your item donation next?';
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || typeof body.stage !== 'string') {
    return NextResponse.json({ error: 'messages[] and stage required' }, { status: 400 });
  }

  const apiKey = process.env.ZAI_API_KEY?.trim() || process.env.BIGMODEL_API_KEY?.trim();
  const detectedItem = typeof body.detectedItem === 'string' ? body.detectedItem : 'Unknown item';
  const userLatest =
    typeof body.userLatest === 'string' && body.userLatest.trim()
      ? body.userLatest.trim()
      : lastUserContent(body.messages);

  const matchTranscript = chatContextTranscript(body.messages, userLatest, detectedItem);
  const matchedAgents = getTopMatchedReceivers(matchTranscript, detectedItem, undefined, userLatest);

  if (!apiKey) {
    const reply = appendMatchedAgentsHint(fallbackReply(body.stage, detectedItem), matchedAgents);
    return NextResponse.json({
      reply,
      matchedAgents,
      source: 'fallback',
    });
  }

  const base = (process.env.ZAI_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.GLM_MODEL?.trim() || DEFAULT_MODEL;
  const url = `${base}/chat/completions`;

  const catalogBrief = NGO_DEMAND_CATALOG.map(
    (n) => `- ${n.name} (${n.id}): ${n.demandCategories.join(', ')}; urgency ${n.urgencyLabel}; ${n.currentGap}`,
  ).join('\n');

  const matchedJson = JSON.stringify(jsonSafeMatchedAgents(matchedAgents), null, 0);

  const system = `You are **DonateAI Assistant** for **physical item donations only** (no money/pledge flow).

## Core behavior
- Understand donor intent for **items** (what item, condition expectation, quantity, area, timing).
- Guide donor through item workflow: clarify details -> ask for photo when needed -> explain matched NGOs.
- Do not discuss cash/monetary/e-wallet paths.

## Item-donation guidance
- If user intent is vague, ask 1-2 short clarifying questions about item type + quantity + location.
- Keep guidance practical and concise.
- Mention that photos are submitted only after user presses Send.

## Matched donation agents (required)
- After donor describes items, reference matched agents from JSON.
- Name at least the first NGO and explain why it fits the item and urgency.
- Keep recommendations grounded in catalog facts only.

MATCHED_DONATION_AGENTS_JSON:
${matchedJson}

## Accuracy
- Do not invent pickup guarantees, tax receipts, or unavailable services.
- NGO facts must come only from this catalog:
${catalogBrief}

## Style
- Under ~220 words unless user asks for detail.
- Plain text, short paragraphs or bullets.

STAGE=${body.stage}
DETECTED_ITEM_CATEGORY=${detectedItem}
LATEST_USER_MESSAGE=${userLatest}`;

  const recentMessages = body.messages.slice(-20);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [{ role: 'system', content: system }, ...recentMessages],
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('GLM chat error', res.status, t);
      return NextResponse.json({
        reply: appendMatchedAgentsHint(fallbackReply(body.stage, detectedItem), matchedAgents),
        matchedAgents,
        source: 'fallback',
      });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({
        reply: appendMatchedAgentsHint(fallbackReply(body.stage, detectedItem), matchedAgents),
        matchedAgents,
        source: 'fallback',
      });
    }
    return NextResponse.json({ reply, matchedAgents, source: 'glm' });
  } catch (e) {
    console.error('donation-assistant/chat', e);
    return NextResponse.json({
      reply: appendMatchedAgentsHint(fallbackReply(body.stage, detectedItem), matchedAgents),
      matchedAgents,
      source: 'fallback',
    });
  }
}
