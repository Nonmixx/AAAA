import { NGO_DEMAND_CATALOG, type NgoDemandProfile } from './ngos-demand-catalog';
import type { ItemCondition, PlanReceiver } from './donation-plan-types';
import { categoryLabelIsMonetary, textSuggestsMonetaryDonation } from './monetary-donation';

/** Lowercased blob from transcript + detected category for keyword scoring. */
export function donationMatchBlob(transcript: string, detectedItem: string): string {
  return `${transcript} ${detectedItem}`.toLowerCase();
}

/** Last `User:` line from a transcript built like `transcriptRef` (fallback when API has no `userLatest`). */
export function extractLastUserUtterance(transcript: string): string {
  const lines = transcript.split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const m = lines[i].match(/^\s*User:\s*(.+)$/i);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

/** Latest user text clearly describes physical goods (overrides older RM/cash in the thread). */
export function latestTurnLooksLikePhysicalGoods(userText: string): boolean {
  if (!userText.trim()) return false;
  return /\b(cloth|clothes|clothing|shirt|jacket|coat|dress|pants|wear|sock|shoes|apparel|blanket|bedding|food pack|\brice\b|canned|book|textbook|toy|furniture|hygiene|soap|diaper|school suppl|medic(al)?\s*suppl|wheelchair|stroller|in-?kind|physical\s+goods|items?\s+to\s+donate|donate\s+(food|books|clothes|items)|goods\s+to\s+give)/i.test(
    userText,
  );
}

/**
 * Whether receiver cards should use **monetary** (funding) vs **in-kind** (goods) ranking.
 * Uses **latest user turn + detected category** so earlier "RM1000" in the thread does not
 * override a later "I donate clothes" message.
 */
export function useMonetaryReceiverPath(userLatest: string, detectedItem: string): boolean {
  const u = userLatest.trim();
  if (latestTurnLooksLikePhysicalGoods(u)) return false;
  if (categoryLabelIsMonetary(detectedItem)) return true;
  if (u && textSuggestsMonetaryDonation(u)) return true;
  return false;
}

function urgencyOrder(label: NgoDemandProfile['urgencyLabel']): number {
  if (label === 'High') return 3;
  if (label === 'Medium') return 2;
  return 1;
}

/** Tie-break: higher urgency, then higher needLevel (within same score). */
function compareUrgencyHighFirstThenNeed(a: NgoDemandProfile, b: NgoDemandProfile): number {
  const du = urgencyOrder(b.urgencyLabel) - urgencyOrder(a.urgencyLabel);
  if (du !== 0) return du;
  return b.needLevel - a.needLevel;
}

function urgencyBoost(label: NgoDemandProfile['urgencyLabel']): number {
  if (label === 'High') return 4;
  if (label === 'Medium') return 2;
  return 0;
}

/** Donor-chosen axis for **monetary** ranking (chat + matcher). */
export type PledgeRoutingPreference = 'urgent_ops' | 'long_term_programs';

/** How well an NGO fits **cash / RM pledges** (procurement, programs), not in-kind item shape. */
function scoreMonetaryPledgeFit(
  n: NgoDemandProfile,
  blob: string,
  routing?: PledgeRoutingPreference,
): number {
  let s = n.needLevel * 4 + urgencyBoost(n.urgencyLabel) * 2;
  const g = n.currentGap.toLowerCase();
  if (/critical|critically|running low|waitlist|short\b|spike|nightly/i.test(g)) s += 6;

  const cats = n.demandCategories;
  if (cats.some((c) => c.includes('medical'))) s += 7;
  if (cats.includes('baby_supplies')) s += 5;
  if (cats.includes('food')) s += 5;
  if (cats.includes('hygiene')) s += 2;
  if (cats.includes('elder_care')) s += 3;
  if (cats.some((c) => c.includes('school')) || cats.includes('books')) s += 2;
  if (cats.includes('clothing') && !cats.includes('food') && cats.filter((c) => c !== 'clothing').length === 0) {
    s -= 2;
  }

  if (/\bfood\b|\brice\b|\bmeal\b|\bgrocer/i.test(blob) && cats.includes('food')) s += 5;
  if (/medical|health|clinic|medicine/i.test(blob) && cats.some((c) => c.includes('medical'))) s += 6;
  if (/baby|formula|infant/i.test(blob) && cats.includes('baby_supplies')) s += 6;
  if (/elder|senior/i.test(blob) && cats.includes('elder_care')) s += 5;
  if (/shelter|bedding|night|homeless/i.test(blob) && /shelter/i.test(n.name)) s += 5;
  if (/book|read|school|education/i.test(blob) && (cats.includes('books') || cats.some((c) => c.includes('school')))) {
    s += 4;
  }

  if (routing === 'urgent_ops') {
    if (n.urgencyLabel === 'High') s += 6;
    if (/critical|critically|running low|waitlist|short\b|spike|nightly/i.test(g)) s += 5;
    if (cats.some((c) => c.includes('medical'))) s += 4;
    if (cats.includes('food') || cats.includes('baby_supplies')) s += 3;
  }
  if (routing === 'long_term_programs') {
    if (cats.includes('books') || cats.some((c) => c.includes('school')) || cats.includes('electronics_learning')) {
      s += 8;
    }
    if (cats.includes('elder_care')) s += 4;
    if (n.urgencyLabel === 'Medium' || n.urgencyLabel === 'Low') s += 2;
    if (cats.some((c) => c.includes('medical')) && n.urgencyLabel === 'High') s -= 2;
  }

  return s;
}

function primaryFundingTheme(n: NgoDemandProfile): string {
  const cats = n.demandCategories;
  if (cats.some((c) => c.includes('medical'))) return 'medical';
  if (cats.includes('food') || cats.includes('baby_supplies')) return 'food';
  if (/shelter/i.test(n.name)) return 'shelter';
  if (cats.includes('elder_care')) return 'elder';
  if (cats.includes('books')) return 'education';
  return 'general';
}

function pickMonetaryReceiverPair(ranked: NgoDemandProfile[]): [NgoDemandProfile, NgoDemandProfile] {
  const a = ranked[0];
  const themeA = primaryFundingTheme(a);
  const alt = ranked.slice(1).find((n) => primaryFundingTheme(n) !== themeA);
  const b = alt ?? ranked[1] ?? ranked[0];
  return [a, b];
}

function primaryItemTheme(n: NgoDemandProfile): string {
  const cats = n.demandCategories;
  if (cats.includes('clothing')) return 'clothing';
  if (cats.includes('food') || cats.includes('baby_supplies')) return 'food';
  if (cats.some((c) => c.includes('medical'))) return 'medical';
  if (cats.includes('books')) return 'books';
  return 'other';
}

function pickInKindReceiverPair(ranked: NgoDemandProfile[]): [NgoDemandProfile, NgoDemandProfile] {
  const a = ranked[0];
  const themeA = primaryItemTheme(a);
  const alt = ranked.slice(1).find((n) => primaryItemTheme(n) !== themeA);
  const b = alt ?? ranked[1] ?? ranked[0];
  return [a, b];
}

function mkReceiverInKind(n: NgoDemandProfile, pct: number): PlanReceiver {
  const urgency: PlanReceiver['urgency'] =
    n.urgencyLabel === 'High' || n.urgencyLabel === 'Low' ? n.urgencyLabel : 'Medium';
  return {
    ngoId: n.id,
    name: n.name,
    location: n.location,
    allocation: pct,
    percent: pct,
    urgency,
    matchContext: 'in_kind',
    reason: [
      `**In-kind match:** ${n.name} — catalog fit for **physical donations** (${n.urgencyLabel} urgency, need ${n.needLevel}/5).`,
      n.currentGap,
      `Demand categories: ${n.demandCategories.join(', ')}.`,
    ],
  };
}

function mkReceiverMonetary(n: NgoDemandProfile, pct: number): PlanReceiver {
  const urgency: PlanReceiver['urgency'] =
    n.urgencyLabel === 'High' || n.urgencyLabel === 'Low' ? n.urgencyLabel : 'Medium';
  return {
    ngoId: n.id,
    name: n.name,
    location: n.location,
    allocation: pct,
    percent: pct,
    urgency,
    matchContext: 'monetary',
    reason: [
      `**Needs money / funding:** ${n.name} — **${n.urgencyLabel}** urgency (need ${n.needLevel}/5). **Cash / RM pledges** support **operating budgets**, procurement, suppliers, and paid services—not a request for you to bring donated goods yourself.`,
      n.currentGap,
      `Program pillars paid from budgets: ${n.demandCategories.join(', ')}.`,
    ],
  };
}

/** Score catalog NGOs for **in-kind** donation context. */
export function scoreNgoForDonationContext(
  n: NgoDemandProfile,
  blob: string,
  detectedItemLower: string,
  condition?: ItemCondition,
): number {
  let s = n.needLevel * 2;
  for (const c of n.demandCategories) {
    const cat = c.replace(/_/g, ' ');
    const first = cat.split(' ')[0] ?? cat;
    if (blob.includes('food') && c === 'food') s += 5;
    if (blob.includes('rice') && c === 'food') s += 3;
    if (blob.includes('formula') || blob.includes('baby')) {
      if (c === 'baby_supplies' || c === 'food') s += 5;
    }
    if (blob.includes('cloth') && c === 'clothing') s += 5;
    if (blob.includes('blanket') && c === 'blankets') s += 4;
    if (blob.includes('book') && c.includes('book')) s += 4;
    if (blob.includes('medic') && c.includes('medical')) s += 5;
    if (blob.includes('school') && c.includes('school')) s += 3;
    if (blob.includes('hygiene') && c === 'hygiene') s += 4;
    if (blob.includes('elder') && c === 'elder_care') s += 5;
    if ((blob.includes('stem') || blob.includes('electron')) && c === 'electronics_learning') s += 4;
    if (blob.includes('shelter') && n.name.toLowerCase().includes('shelter')) s += 3;
    if (detectedItemLower.includes(first)) s += 2;
  }
  if (condition === 'Worn') s += 0.5;
  return s;
}

export function rankNgosByDonationContext(
  transcript: string,
  detectedItem: string,
  condition?: ItemCondition,
  userLatest?: string,
  pledgeRouting?: PledgeRoutingPreference,
  catalog: NgoDemandProfile[] = NGO_DEMAND_CATALOG,
): NgoDemandProfile[] {
  const blob = donationMatchBlob(transcript, detectedItem);
  const detectedItemLower = detectedItem.toLowerCase();
  void userLatest;
  void pledgeRouting;

  return [...catalog].sort((a, b) => {
    const d =
      scoreNgoForDonationContext(b, blob, detectedItemLower, condition) -
      scoreNgoForDonationContext(a, blob, detectedItemLower, condition);
    if (d !== 0) return d;
    return compareUrgencyHighFirstThenNeed(a, b);
  });
}

/**
 * Top 2 NGO matches with a 60/40 split (same shape as GLM plan receivers).
 * **Cash pledges** use funding-oriented ranking and copy; **in-kind** uses item/category fit.
 * Pass **userLatest** (this Send turn) so earlier RM/cash in the transcript does not override clothing/items.
 */
export function getTopMatchedReceivers(
  transcript: string,
  detectedItem: string,
  condition: ItemCondition | undefined,
  userLatest?: string,
  pledgeRouting?: PledgeRoutingPreference,
  catalog: NgoDemandProfile[] = NGO_DEMAND_CATALOG,
): PlanReceiver[] {
  void userLatest;
  void pledgeRouting;
  const workingCatalog = catalog.length >= 2 ? catalog : NGO_DEMAND_CATALOG;
  const ranked = rankNgosByDonationContext(
    transcript,
    detectedItem,
    condition,
    userLatest,
    pledgeRouting,
    workingCatalog,
  );

  const [a, b] = pickInKindReceiverPair(ranked);
  return [mkReceiverInKind(a, 60), mkReceiverInKind(b, 40)];
}
