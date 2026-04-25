import type { ItemCondition } from './donation-plan-types';

/** Result of screening of a donor-submitted item photo. */
export type PhotoVerificationStatus =
  | 'passed'
  | 'not_a_donation_photo'
  | 'wrong_item_for_category'
  /** Vision API unreachable, bad HTTP response, or JSON we could not parse — not a judgment on photo content. */
  | 'analysis_failed';

export interface DonationImageAnalysisResult {
  verification: PhotoVerificationStatus;
  condition: ItemCondition;
  /** Best-effort category inferred from image content. */
  detectedCategory?: string;
  /** Optional compact evidence points extracted from the photo. */
  keyDetails?: string[];
  /** Short description of what is visible (English). */
  visibleSummary: string;
  /** Shown to donor when verification !== passed or when condition is Damaged context. */
  guidance: string;
  source: 'fallback' | 'glm-vision' | 'gemini-vision';
}

export function normalizeCondition(x: string): ItemCondition {
  const u = x.trim().toLowerCase();
  if (u === 'unknown' || u === 'n/a' || u === 'not assessed' || u === 'unassessed') return 'Unknown';
  if (u === 'damaged' || u.includes('damage')) return 'Damaged';
  if (u === 'worn' || u.includes('worn')) return 'Worn';
  return 'Good';
}
