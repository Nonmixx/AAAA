import type { PlanReceiver } from './donation-plan-types';
import { isMonetaryDonationContext } from './monetary-donation';
import type {
  DonationDeliveryOption,
  DonationImpactEstimate,
  DonationLogisticsAssessment,
  DonationStructuredObject,
  DonationWorkflowNgoSummary,
  DonationWorkflowPhase,
  DonationWorkflowSnapshot,
} from './donation-workflow-types';

function parseDistanceKm(locationLabel: string): number | null {
  const m = locationLabel.match(/([\d.]+)\s*km/i);
  if (!m?.[1]) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function detectedCategoryToSlug(detectedItem: string): string {
  const s = detectedItem.toLowerCase();
  if (s.includes('electron') || s.includes('computer') || s.includes('laptop') || s.includes('gadget')) return 'mixed_items';
  if (s.includes('cloth') || s.includes('wear') || s.includes('apparel')) return 'clothes';
  if (s.includes('food') || s.includes('rice') || s.includes('pack')) return 'food_packs';
  if (s.includes('book') || s.includes('school')) return 'school_supplies';
  if (s.includes('blanket') || s.includes('bedding')) return 'blankets_bedding';
  if (s.includes('medical')) return 'medical_supplies';
  return 'mixed_items';
}

function urgencyFromReceivers(agents: PlanReceiver[]): DonationStructuredObject['urgency'] {
  const top = agents[0];
  if (!top) return 'normal';
  if (top.urgency === 'High') return 'high';
  if (top.urgency === 'Medium') return 'medium';
  if (top.urgency === 'Low') return 'low';
  return 'normal';
}

function inferMissingFields(userLatest: string, categorySlug: string): string[] {
  const ul = userLatest.trim();
  const missing: string[] = [];

  if (categorySlug === 'clothes') {
    const hasClothingKind =
      /\b(baby|adult|children|kids?|toddler|infant|teen|men'?s|women'?s|unisex|winter|summer|spring|office|formal|casual|coat|jacket|jeans?|dress|shirt|blouse|uniform|school|socks|shoes|hoodie|sweater|mixed)\b/i.test(
        ul,
      );
    if (!hasClothingKind) missing.push('category_detail');
  }

  if (categorySlug === 'food_packs') {
    const hasFoodType =
      /\b(canned|tin|dry|rice|noodle|pasta|biscuit|baby formula|formula|milk powder|cooking oil|flour|lentil|bean|instant|ready-to-eat|snack|mixed food)\b/i.test(
        ul,
      );
    if (!hasFoodType) missing.push('category_detail');
  }

  const hasQuantity =
    /\d/.test(ul) ||
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen)\b/i.test(ul) ||
    /\b(bag|box|piece|pair|set|lot|bundle|sack|trash\s*bag|luggage)s?\b/i.test(ul) ||
    /\b\d+\s*kg\b|\b~?\d+\s*-\s*\d+\s*kg\b/i.test(ul);
  if (!hasQuantity) missing.push('quantity');

  const hasLocation =
    /\b(at|in|from|near|around|within)\b/i.test(ul) ||
    /\b(pj|kl|klang|shah|subang|petaling|lumpur|sentral|wangsa|cheras|ampang|damansara|usj|puchong|kelana|bangsar|melawati|mont\s*kiara|putrajaya|cyberjaya)\b/i.test(ul) ||
    /\b\d+(\.\d+)?\s*km\b/i.test(ul);
  if (!hasLocation) missing.push('location');

  if (categorySlug !== 'food_packs') {
    const hasCondition =
      /\b(new|gently\s*used|lightly\s*worn|unworn|tags?\s*on|excellent|good\s*cond|fair|worn|damaged|like\s*new)\b/i.test(
        ul,
      );
    if (!hasCondition) missing.push('condition');
  }

  return missing;
}

function parseKgHint(userLatest: string): number | null {
  const m = userLatest.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (!m?.[1]) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildImpact(categorySlug: string, userLatest: string): DonationImpactEstimate {
  const kg = parseKgHint(userLatest);
  if (categorySlug === 'clothes') {
    const baseLow = 20;
    const baseHigh = 30;
    const scale = kg ? Math.max(0.6, Math.min(2.5, kg / 10)) : 1;
    const low = Math.round(baseLow * scale);
    const high = Math.round(baseHigh * scale);
    return {
      headline: 'Estimated community reach (indicative)',
      beneficiaryLow: low,
      beneficiaryHigh: high,
      basisNote: kg
        ? `Scaled from ~${low}–${high} individuals per ~${kg} kg clothing bundle (demo heuristic, not a guarantee).`
        : 'Demo heuristic: ~20–30 individuals supported per ~10 kg of usable clothing when routed to high-need partners.',
    };
  }
  if (categorySlug === 'food_packs') {
    return {
      headline: 'Estimated meal-equivalent reach',
      beneficiaryLow: 12,
      beneficiaryHigh: 40,
      basisNote: 'Varies by pack size and partner kitchen capacity — catalog-grounded estimate only.',
    };
  }
  return {
    headline: 'Estimated beneficiary touchpoints',
    beneficiaryLow: 8,
    beneficiaryHigh: 25,
    basisNote: 'Broad in-kind estimate until quantity and condition screening complete.',
  };
}

function buildLogistics(agents: PlanReceiver[], userLatest: string): DonationLogisticsAssessment {
  const km = agents.map((a) => parseDistanceKm(a.location)).filter((n): n is number => n != null);
  const minKm = km.length ? Math.min(...km) : null;
  const ngo_dropoff_near_catalog = minKm != null && minKm <= 15;
  const donor_can_self_deliver = true;
  const ai_pickup_requestable = true;
  /** Program rails exist for corporate wallet + community board funded drivers (demo product copy). */
  const sponsored_delivery_available = true;
  const hasDeliveryPref =
    /\b(drop\s*[- ]?off|self\s*-?\s*drop|i'?ll bring|pickup|pick\s*up|corporate\s*wallet|crowdfund|community\s*board)\b/i.test(
      userLatest,
    );
  const summary = hasDeliveryPref
    ? 'Donor hinted at logistics — only platform-funded pickup or self drop-off; never donor-paid couriers. Pickup funding auto-routes: wallet first, then community fallback.'
    : ngo_dropoff_near_catalog
      ? 'Partners exist within catalog distances — reassure: self drop-off or platform-funded pickup; donor never pays Lalamove/Grab. Pickup funding auto-routes wallet first, then community fallback.'
      : 'Confirm city/area first; transport options remain self drop-off or platform-funded pickup only.';
  return {
    donor_can_self_deliver,
    ai_pickup_requestable,
    ngo_dropoff_near_catalog,
    sponsored_delivery_available,
    summary,
  };
}

function defaultDeliveryOptions(): DonationDeliveryOption[] {
  return [
    {
      id: 'pickup_platform_auto',
      label: 'Platform-funded pickup (auto funding)',
      description:
        'System auto-selects funding: Corporate Logistics Wallet first; if insufficient, Community Crowdfunding Board fallback. Donor never books or pays third-party couriers.',
      recommended: true,
    },
    {
      id: 'self_dropoff',
      label: 'Drop-off yourself',
      description: 'You bring items to a verified NGO or partner hub when convenient.',
    },
  ];
}

function mapPhase(
  stage: string,
  missingCount: number,
  intent: DonationWorkflowSnapshot['intent'],
): DonationWorkflowPhase {
  if (intent === 'unsupported') return 'intent_understanding';
  if (stage === 'greeting') return 'intent_understanding';
  if (stage === 'details') return missingCount > 0 ? 'structured_intake' : 'awaiting_confirmation';
  if (stage === 'awaiting_image') return 'awaiting_photo';
  if (stage === 'analyzing') return 'matching';
  if (stage === 'result_suitable' || stage === 'result_unsuitable') return 'complete';
  return 'structured_intake';
}

function flowId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, '0');
  return `DF-${t.slice(-4)}${r}`;
}

function toNgoSummaries(agents: PlanReceiver[]): DonationWorkflowNgoSummary[] {
  return agents.slice(0, 3).map((r) => ({
    name: r.name,
    ngoId: r.ngoId,
    location: r.location,
    urgency: r.urgency,
    routing_percent: r.percent,
  }));
}

function buildQuestions(missing: string[], categoryDisplay: string): string[] {
  if (missing.some((m) => m.includes('cash_flow'))) {
    return ['This assistant routes **physical goods** only. Describe items (e.g. clothes, packs) you want to donate.'];
  }
  const isFood = /food|rice|pack|canned|tin/i.test(categoryDisplay);
  const qs: string[] = [];
  if (missing.includes('category_detail')) {
    qs.push(
      isFood
        ? 'What type of food is it? (e.g. canned/tin food, dry food packs, baby formula, daily necessities)'
        : 'What kind of clothes are they? (e.g. baby clothes, adult winter coats, office wear)',
    );
  }
  if (missing.includes('quantity')) qs.push('Roughly how many items or bags are you donating?');
  if (missing.includes('location')) qs.push('What city or area are you located in?');
  if (missing.includes('condition'))
    qs.push('What condition are they in overall? (e.g. gently used, like new, worn, damaged)');
  if (!qs.length) qs.push('Confirm delivery preference: drop off yourself or platform-funded pickup.');
  return qs.slice(0, 4);
}

export interface BuildWorkflowParams {
  stage: string;
  userLatest: string;
  detectedItem: string;
  matchedAgents: PlanReceiver[];
  /** When set (e.g. from client session ref), reuse so one chat session keeps one flow id. */
  existingFlowId?: string | null;
}

/**
 * Deterministic workflow snapshot (Steps 1–6): intent inference, structured object,
 * logistics hints, NGO matching (from matcher), flow id + state for UI / grading.
 * GLM chat prose is layered on top in the API route using this JSON as ground truth.
 */
function isValidClientFlowId(id: string | null | undefined): id is string {
  return typeof id === 'string' && /^DF-[A-Z0-9]{4,24}$/i.test(id.trim());
}

export function buildDonationWorkflowSnapshot(p: BuildWorkflowParams): DonationWorkflowSnapshot {
  const { stage, userLatest, detectedItem, matchedAgents, existingFlowId } = p;
  const ul = userLatest.trim();
  const category_slug = detectedCategoryToSlug(detectedItem);
  const category_display = detectedItem.trim() || 'Items';

  const monetary = isMonetaryDonationContext(ul, detectedItem);
  const intent: DonationWorkflowSnapshot['intent'] = monetary ? 'unsupported' : 'donate_physical_item';

  const missing_fields =
    intent === 'donate_physical_item'
      ? inferMissingFields(ul, category_slug)
      : ['cash_flow_not_supported_in_item_assistant'];
  const urgency = urgencyFromReceivers(matchedAgents);
  let status: DonationStructuredObject['status'] = 'incomplete';
  if (stage === 'awaiting_image' || stage === 'analyzing') status = 'ready_for_screening';
  else if (stage === 'result_suitable') status = 'allocated';

  const structured_donation: DonationStructuredObject = {
    donation_type: intent === 'donate_physical_item' ? category_slug : 'monetary_redirect',
    urgency,
    status,
    missing_fields,
    quantity_note: /\d/.test(ul) ? ul.slice(0, 120) : null,
    location_note: null,
    preferred_delivery: null,
  };

  const logistics = buildLogistics(matchedAgents, ul);
  const impact = buildImpact(category_slug, ul);
  const phase = mapPhase(stage, intent === 'donate_physical_item' ? missing_fields.length : 0, intent);

  const action_type: DonationWorkflowSnapshot['action_type'] =
    intent === 'unsupported'
      ? 'clarification'
      : stage === 'details' && /\b(donate|giving|give|want to)\b/i.test(ul)
        ? 'donation_initiation'
        : 'follow_up';

  const workflow_state_label =
    intent === 'unsupported'
      ? 'Unsupported path (monetary)'
      : missing_fields.length > 0 && stage === 'details'
        ? 'Awaiting logistics + quantity'
        : stage === 'awaiting_image'
          ? 'Awaiting delivery preference'
          : stage === 'analyzing'
            ? 'Matching analysis'
            : 'Ready for next donor action';

  const next_step_user =
    intent === 'unsupported'
      ? 'Switch to item donation wording or use pledge flows elsewhere.'
      : stage === 'awaiting_image'
        ? 'Choose delivery preference (drop-off or platform-funded pickup).'
        : missing_fields.length > 0
          ? 'Answer the open questions (category detail, quantity, condition, location), then continue.'
          : 'Confirm delivery preference, then continue to recommendation.';

  return {
    version: 1,
    flow_id: isValidClientFlowId(existingFlowId) ? existingFlowId.trim().toUpperCase() : flowId(),
    phase,
    workflow_state_label,
    next_step_user,
    intent,
    category_display,
    category_slug,
    action_type,
    structured_donation,
    logistics,
    impact,
    matched_ngo_summaries: toNgoSummaries(matchedAgents),
    delivery_options: defaultDeliveryOptions(),
    questions_to_resolve: buildQuestions(missing_fields, category_display),
    engine: 'donation-workflow-engine@v1',
  };
}

export function workflowOrchestrationPromptBlock(snapshot: DonationWorkflowSnapshot): string {
  return `## Server workflow orchestration (AUTHORITATIVE JSON)
The API already ran intent + matching tools. **Do not contradict** NGOs, flow_id, urgency, or missing_fields.
Mirror \`workflow_state_label\` and \`next_step_user\` in your tone. Ground NGO names only in MATCHED_DONATION_AGENTS_JSON.

\`\`\`json
${JSON.stringify(snapshot, null, 0)}
\`\`\``;
}
