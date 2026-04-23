import type { ItemCondition } from './donation-plan-types';

/** Result of vision (or fallback) screening of a donor-submitted item photo. */
export type PhotoVerificationStatus = 'passed' | 'not_a_donation_photo' | 'wrong_item_for_category';

export interface DonationImageAnalysisResult {
  verification: PhotoVerificationStatus;
  condition: ItemCondition;
  /** Short description of what is visible (English). */
  visibleSummary: string;
  /** Shown to donor when verification !== passed or when condition is Damaged context. */
  guidance: string;
  source: 'glm-vision' | 'fallback';
}

export function normalizeCondition(x: string): ItemCondition {
  const u = x.trim().toLowerCase();
  if (u === 'damaged' || u.includes('damage')) return 'Damaged';
  if (u === 'worn' || u.includes('worn')) return 'Worn';
  return 'Good';
}
