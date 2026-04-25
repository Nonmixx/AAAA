import { NextResponse } from 'next/server';
import { getTopMatchedReceivers } from '../../../lib/match-donation-ngos';
import type { PlanReceiver } from '../../../lib/donation-plan-types';
import { getLiveNgoDemandCatalog } from '../../../lib/live-ngo-demand-catalog';
import {
  buildChatStageResponseContract,
  buildDonateAiIntakePolicySection,
  buildWorkflowOrchestrationPromptSection,
} from '../../../lib/donation-assistant-workflow';
import {
  buildDonationWorkflowSnapshot,
  workflowOrchestrationPromptBlock,
} from '../../../lib/donation-workflow-engine';
import {
  getAnthropicModel,
  getGlmModel,
  getZaiApiKey,
  getZaiCandidateBases,
  isAnthropicCompatibleBase,
} from '../../../lib/zai-env';

type ApiMsg = { role: 'user' | 'assistant'; content: string };

interface ChatBody {
  messages: ApiMsg[];
  stage: string;
  detectedItem: string;
  userLatest?: string;
  /** Client keeps one id per assistant session so workflow stays traceable across turns. */
  donationFlowId?: string | null;
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

/** Avoid duplicating the top NGO when `details` fallback already inlined it. */
function withFallbackAgentsFooter(stage: string, reply: string, agents: PlanReceiver[]): string {
  // Keep early intake turns clean and step-by-step; do not append NGO block yet.
  if (stage === 'awaiting_image') return reply;
  if (stage === 'details' && agents[0]) return reply;
  return appendMatchedAgentsHint(reply, agents);
}

function enforceConfirmationBoundary(stage: string, reply: string): string {
  const hasFalseFinality =
    /already in the system|details are locked in|thanks for confirming|you'?re all set|donation submitted|pickup coordination is now underway|system will coordinate/i.test(
      reply,
    );

  if (stage !== 'awaiting_delivery_choice' && hasFalseFinality) {
    return 'To save your donation and make it appear on Tracking, finish the in-app confirmation flow and choose a delivery option button when shown. Chat messages alone do not submit the donation.';
  }

  return reply;
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

function firstSentenceFromReasons(reason?: string[]): string {
  const t = reason?.find((s) => s?.trim())?.trim();
  return t || 'aligned with current catalog demand signals for this category.';
}

function fallbackReply(stage: string, detectedItem: string, agents: PlanReceiver[], userLatest: string): string {
  void userLatest;
  const ngos = agents.slice(0, 3).map((n) => n.name).join(', ');
  const transportNote =
    "\n\n(And don't worry about transport! You can **drop items off yourself** at a verified partner, or choose **platform-funded pickup**. Funding is auto-routed: Corporate Logistics Wallet first, then Community Crowdfunding fallback if needed — **you never pay** for Lalamove, Grab, or other paid couriers.)";

  if (stage === 'greeting') {
    return `Hi! I can help you donate **physical items** and match them to NGO demand. Tell me what items you want to donate (e.g. clothing, food packs, books), and your area. Partners include: ${ngos}.`;
  }
  if (stage === 'details') {
    const label = detectedItem?.trim() || 'your items';
    const isFood = /food|rice|pack|canned|tin|formula/i.test(label);
    return isFood
      ? `Great — I noted **${label}**.\n\nNext step: tell me the **type of food** (e.g. canned/tin food, dry packs, baby formula, daily necessities), then I will ask your delivery preference.${transportNote}`
      : `Great — I noted **${label}**.\n\nNext step: tell me the **overall condition** (e.g. like new, gently used, worn, damaged), then I will ask your delivery preference.${transportNote}`;
  }
  if (stage === 'awaiting_image') {
    return 'Quick check: do you prefer **drop off yourself** or **platform-funded pickup**?';
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

  const apiKey = getZaiApiKey();
  const detectedItem = typeof body.detectedItem === 'string' ? body.detectedItem : 'Unknown item';
  const userLatest =
    typeof body.userLatest === 'string' && body.userLatest.trim()
      ? body.userLatest.trim()
      : lastUserContent(body.messages);

  const matchTranscript = chatContextTranscript(body.messages, userLatest, detectedItem);
  const liveCatalog = await getLiveNgoDemandCatalog();
  const matchedAgents = getTopMatchedReceivers(matchTranscript, detectedItem, undefined, userLatest, undefined, liveCatalog);
  const workflow = buildDonationWorkflowSnapshot({
    stage: body.stage,
    userLatest,
    detectedItem,
    matchedAgents,
    existingFlowId: typeof body.donationFlowId === 'string' ? body.donationFlowId : null,
  });

  if (!apiKey) {
    const reply = withFallbackAgentsFooter(
      body.stage,
      fallbackReply(body.stage, detectedItem, matchedAgents, userLatest),
      matchedAgents,
    );
    return NextResponse.json({
      reply: enforceConfirmationBoundary(body.stage, reply),
      matchedAgents,
      workflow,
      source: 'fallback',
      sourceReason: 'missing_api_key',
    });
  }

  const model = getGlmModel();
  const anthropicModel = getAnthropicModel();
  const baseCandidates = getZaiCandidateBases();

  const catalogBrief = liveCatalog.map(
    (n) => `- ${n.name} (${n.id}): ${n.demandCategories.join(', ')}; urgency ${n.urgencyLabel}; ${n.currentGap}`,
  ).join('\n');

  const matchedJson = JSON.stringify(jsonSafeMatchedAgents(matchedAgents), null, 0);

  const system = `${buildWorkflowOrchestrationPromptSection('chat', body.stage)}

${workflowOrchestrationPromptBlock(workflow)}

${buildDonateAiIntakePolicySection()}

${buildChatStageResponseContract(body.stage, detectedItem)}

You are **DonateAI Assistant** for **physical item donations only** (no money/pledge flow).

## Core behavior
- Understand donor intent for **items** across the **four intake fields** (category / quantity / condition / location) and the **transport rules** in the Intake Assistant block.
- Guide donor through item workflow: clarify details → confirm delivery preference → explain matched NGOs.
- Do not discuss cash/monetary/e-wallet paths.
- During intake, be a turn-by-turn assistant: ask only one next question per reply.

## Item-donation guidance
- If user intent is vague, ask friendly follow-up only for the **single next missing** field.
- Keep guidance practical and concise.
- Do not produce multi-question checklists in one message.
- Keep intake replies short (usually 40-90 words).

## Matched donation agents (required)
- After intake fields + delivery preference are clear (or donor explicitly asks for matching), reference matched agents from JSON.
- Name at least the first NGO and explain why it fits the item and urgency.
- Keep recommendations grounded in catalog facts only.

MATCHED_DONATION_AGENTS_JSON:
${matchedJson}

## Accuracy
- Do not invent pickup times, tax receipts, or unavailable services.
- NGO facts must come only from this catalog:
${catalogBrief}

## Style
- Under ~260 words on a rich first intake turn; shorter on follow-ups.
- Plain text, short paragraphs or bullets (light emoji is OK when it improves scanability).
- Align transport language with \`delivery_options\` in workflow JSON (drop-off or platform-funded pickup only; donor never pays couriers).

STAGE=${body.stage}
DETECTED_ITEM_CATEGORY=${detectedItem}
LATEST_USER_MESSAGE=${userLatest}
WORKFLOW_FLOW_ID=${workflow.flow_id}`;

  const recentMessages = body.messages.slice(-20);

  try {
    let res: Response | null = null;
    let lastReason = 'glm_unreachable';
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
              max_tokens: 700,
              temperature: 0.4,
              system,
              messages: recentMessages.map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
              })),
            }
          : {
              model,
              temperature: 0.4,
              messages: [{ role: 'system', content: system }, ...recentMessages],
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
        lastReason = `glm_http_${candidate.status}_${base.replace(/^https?:\/\//, '')}`;
        // For non-auth failures (e.g., 5xx/timeout hosts), continue to next base candidate.
      }
      if (res) break;
    }
    if (!res) {
      return NextResponse.json({
        reply: enforceConfirmationBoundary(
          body.stage,
          withFallbackAgentsFooter(
            body.stage,
            fallbackReply(body.stage, detectedItem, matchedAgents, userLatest),
            matchedAgents,
          ),
        ),
        matchedAgents,
        workflow,
        source: 'fallback',
        sourceReason: lastReason,
      });
    }

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('GLM chat error', res.status, t);
      return NextResponse.json({
        reply: enforceConfirmationBoundary(
          body.stage,
          withFallbackAgentsFooter(
            body.stage,
            fallbackReply(body.stage, detectedItem, matchedAgents, userLatest),
            matchedAgents,
          ),
        ),
        matchedAgents,
        workflow,
        source: 'fallback',
        sourceReason: lastReason,
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      content?: { type?: string; text?: string }[];
    };
    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      data.content?.find((c) => c.type === 'text')?.text?.trim();
    if (!reply) {
      return NextResponse.json({
        reply: enforceConfirmationBoundary(
          body.stage,
          withFallbackAgentsFooter(
            body.stage,
            fallbackReply(body.stage, detectedItem, matchedAgents, userLatest),
            matchedAgents,
          ),
        ),
        matchedAgents,
        workflow,
        source: 'fallback',
        sourceReason: 'empty_glm_reply',
      });
    }
    return NextResponse.json({
      reply: enforceConfirmationBoundary(body.stage, reply),
      matchedAgents,
      workflow,
      source: 'glm',
    });
  } catch (e) {
    console.error('donation-assistant/chat', e);
    return NextResponse.json({
      reply: enforceConfirmationBoundary(
        body.stage,
        withFallbackAgentsFooter(
          body.stage,
          fallbackReply(body.stage, detectedItem, matchedAgents, userLatest),
          matchedAgents,
        ),
      ),
      matchedAgents,
      workflow,
      source: 'fallback',
      sourceReason: 'network_or_runtime_error',
    });
  }
}
