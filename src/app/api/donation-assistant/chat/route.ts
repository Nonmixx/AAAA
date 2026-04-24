import { NextResponse } from 'next/server';
import { NGO_DEMAND_CATALOG } from '../../../lib/ngos-demand-catalog';
import { getTopMatchedReceivers } from '../../../lib/match-donation-ngos';
import type { DeliveryPreference, PlanReceiver } from '../../../lib/donation-plan-types';
import { getLiveMatchedReceivers } from '@/lib/disaster/liveDonationMatching';

const DEFAULT_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const DEFAULT_MODEL = 'ilmu-glm-5.1';

type ApiMsg = { role: 'user' | 'assistant'; content: string };

interface ChatBody {
  messages: ApiMsg[];
  stage: string;
  detectedItem: string;
  userLatest?: string;
  deliveryPreference?: DeliveryPreference;
}

function deliveryPreferenceLabel(preference?: DeliveryPreference): string {
  return preference === 'self_delivery' ? 'Self delivery' : 'Platform delivery';
}

function lastUserContent(messages: ApiMsg[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

function chatContextTranscript(
  messages: ApiMsg[],
  userLatest: string,
  detectedItem: string,
  deliveryPreference?: DeliveryPreference,
): string {
  const recentUsers = messages
    .filter((message) => message.role === 'user')
    .slice(-8)
    .map((message) => message.content.trim())
    .filter(Boolean);
  const tail = recentUsers.length ? recentUsers.join('\n') : userLatest;
  return `${tail}\n[Detected category: ${detectedItem}]\n[Delivery preference: ${deliveryPreferenceLabel(deliveryPreference)}]`;
}

function appendMatchedAgentsHint(reply: string, agents: PlanReceiver[]): string {
  const [a, b] = agents;
  if (!a) return reply;
  if (!b || a.ngoId === b.ngoId) {
    return `${reply}\n\n**Matched donation agents:** ${a.name} (${a.percent}%) - suggested item-donation routing from current demand data.`;
  }
  return `${reply}\n\n**Matched donation agents:** ${a.name} (${a.percent}%) · ${b.name} (${b.percent}%) - suggested item-donation routing from current demand data.`;
}

function jsonSafeMatchedAgents(agents: PlanReceiver[]) {
  return agents.map((receiver) => ({
    name: receiver.name,
    ngoId: receiver.ngoId,
    allocationPercent: receiver.percent,
    urgency: receiver.urgency,
    location: receiver.location,
    reasons: receiver.reason,
    matchContext: receiver.matchContext,
  }));
}

function fallbackReply(stage: string, detectedItem: string, deliveryPreference?: DeliveryPreference): string {
  const ngos = NGO_DEMAND_CATALOG.map((ngo) => ngo.name).join(', ');
  const deliveryLine = `Current delivery choice: ${deliveryPreferenceLabel(deliveryPreference)}.`;

  if (stage === 'greeting') {
    return `Hi! I can help you donate **physical items** and match them to current receiver demand. Tell me what items you want to donate (for example: clothing, food packs, books), and your area. Example partners include: ${ngos}.\n\n${deliveryLine}`;
  }
  if (stage === 'details') {
    return `Thanks - I've noted your donation focus as "${detectedItem}".\n\n${deliveryLine}\n\nTo proceed with item donation, please share:\n- Rough quantity or number of boxes\n- Pickup or drop-off area\n- Timing constraints\n\nWhen ready, upload a clear item photo and press **Send** (nothing is uploaded until Send).`;
  }
  if (stage === 'awaiting_image') {
    return `I'm ready to screen **item condition** once I have a photo.\n\n${deliveryLine}\n\n1) Tap the image button and select one clear photo.\n2) Add an optional caption.\n3) Press **Send** to run analysis.\n\nNeed guidance? I can suggest suitable organizations after screening.`;
  }
  return `${deliveryLine}\n\nHow can I help with your item donation next?`;
}

async function getMatchedAgents(transcript: string, detectedItem: string, userLatest: string) {
  return (await getLiveMatchedReceivers(transcript, detectedItem)) ??
    getTopMatchedReceivers(transcript, detectedItem, undefined, userLatest);
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

  const matchTranscript = chatContextTranscript(body.messages, userLatest, detectedItem, body.deliveryPreference);
  const matchedAgents = await getMatchedAgents(matchTranscript, detectedItem, userLatest);

  if (!apiKey) {
    const reply = appendMatchedAgentsHint(fallbackReply(body.stage, detectedItem, body.deliveryPreference), matchedAgents);
    return NextResponse.json({
      reply,
      matchedAgents,
      source: 'fallback',
    });
  }

  const base = (process.env.ZAI_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.GLM_MODEL?.trim() || DEFAULT_MODEL;
  const url = `${base}/chat/completions`;

  const matchedJson = JSON.stringify(jsonSafeMatchedAgents(matchedAgents), null, 0);

  const system = `You are **DonateAI Assistant** for **physical item donations only** (no money/pledge flow).

## Core behavior
- Understand donor intent for **items** (what item, condition expectation, quantity, area, timing).
- Guide donor through item workflow: clarify details -> ask for photo when needed -> explain matched organizations.
- Do not discuss cash or e-wallet flows.

## Item-donation guidance
- If user intent is vague, ask 1-2 short clarifying questions about item type, quantity, and location.
- Keep guidance practical and concise.
- Mention that photos are submitted only after the user presses Send.
- Respect the donor's delivery choice. If they chose self delivery, talk in terms of donor drop-off or handoff. If they chose platform delivery, talk in terms of platform-coordinated delivery without promising guaranteed pickup times.

## Matched donation agents
- After donor describes items, reference matched agents from JSON.
- Name at least the first organization and explain why it fits the item and urgency.
- Keep recommendations grounded in the matched JSON only.

MATCHED_DONATION_AGENTS_JSON:
${matchedJson}

## Accuracy
- Do not invent pickup guarantees, tax receipts, or unavailable services.
- If the matched JSON appears to come from live needs, speak in terms of current active needs.
- If the matched JSON appears to come from the fallback catalog, treat it as a best-effort fallback.

## Style
- Under ~220 words unless the user asks for detail.
- Plain text, short paragraphs or bullets.

STAGE=${body.stage}
DETECTED_ITEM_CATEGORY=${detectedItem}
LATEST_USER_MESSAGE=${userLatest}
DELIVERY_PREFERENCE=${deliveryPreferenceLabel(body.deliveryPreference)}`;

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
      const text = await res.text().catch(() => '');
      console.error('GLM chat error', res.status, text);
      return NextResponse.json({
        reply: appendMatchedAgentsHint(fallbackReply(body.stage, detectedItem, body.deliveryPreference), matchedAgents),
        matchedAgents,
        source: 'fallback',
      });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({
        reply: appendMatchedAgentsHint(fallbackReply(body.stage, detectedItem, body.deliveryPreference), matchedAgents),
        matchedAgents,
        source: 'fallback',
      });
    }

    return NextResponse.json({ reply, matchedAgents, source: 'glm' });
  } catch (error) {
    console.error('donation-assistant/chat', error);
    return NextResponse.json({
      reply: appendMatchedAgentsHint(fallbackReply(body.stage, detectedItem, body.deliveryPreference), matchedAgents),
      matchedAgents,
      source: 'fallback',
    });
  }
}
