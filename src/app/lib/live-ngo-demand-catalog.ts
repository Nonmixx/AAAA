import type { NgoDemandProfile } from './ngos-demand-catalog';
import { NGO_DEMAND_CATALOG } from './ngos-demand-catalog';
import { fetchPublicBrowseReceivers } from '@/lib/publicNeeds';

function mapUrgency(items: Array<{ urgency: 'high' | 'medium' | 'low' }>, emergency: boolean): NgoDemandProfile['urgencyLabel'] {
  if (emergency || items.some((i) => i.urgency === 'high')) return 'High';
  if (items.some((i) => i.urgency === 'medium')) return 'Medium';
  return 'Low';
}

function mapNeedLevel(
  items: Array<{ quantity: number; urgency: 'high' | 'medium' | 'low' }>,
  emergency: boolean,
): NgoDemandProfile['needLevel'] {
  const qty = items.reduce((sum, i) => sum + Math.max(0, i.quantity || 0), 0);
  const highCount = items.filter((i) => i.urgency === 'high').length;
  if (emergency) return 5;
  if (highCount >= 2 || qty >= 120) return 5;
  if (highCount >= 1 || qty >= 70) return 4;
  if (qty >= 30) return 3;
  if (qty >= 10) return 2;
  return 1;
}

function mapCategoryToken(text: string): string[] {
  const t = text.toLowerCase();
  const out = new Set<string>();
  if (/cloth|apparel|shirt|jacket|pants|wear|uniform|shoe/.test(t)) out.add('clothing');
  if (/food|rice|meal|dry|tin|canned|formula|grocery/.test(t)) out.add('food');
  if (/baby|infant|toddler|diaper/.test(t)) out.add('baby_supplies');
  if (/book|textbook|stationery|school|suppl/.test(t)) out.add('school_supplies');
  if (/book|library|textbook/.test(t)) out.add('books');
  if (/blanket|bedding|mattress|pillow/.test(t)) out.add('blankets');
  if (/medical|medicine|bandage|clinic|first aid/.test(t)) out.add('medical_supplies');
  if (/hygiene|soap|toothpaste|sanitary/.test(t)) out.add('hygiene');
  if (/elder|senior|wheelchair/.test(t)) out.add('elder_care');
  if (/electronic|laptop|computer|desktop|phone|tablet|gadget|stem/.test(t)) out.add('electronics_learning');
  if (out.size === 0) out.add('mixed_items');
  return [...out];
}

function normalizeLocation(location: string): string {
  return location?.trim() || 'Location on file';
}

export async function getLiveNgoDemandCatalog(): Promise<NgoDemandProfile[]> {
  const cards = await fetchPublicBrowseReceivers();
  if (!cards.length) return NGO_DEMAND_CATALOG;

  const mapped: NgoDemandProfile[] = cards.map((org) => {
    const categories = new Set<string>();
    for (const item of org.items) {
      const tokens = mapCategoryToken(`${item.item}`);
      tokens.forEach((c) => categories.add(c));
    }
    const demandCategories = [...categories];
    const urgencyLabel = mapUrgency(org.items, org.emergency);
    const needLevel = mapNeedLevel(org.items, org.emergency);
    const topItems = org.items
      .slice()
      .sort((a, b) => (a.urgency === 'high' ? -1 : 1) - (b.urgency === 'high' ? -1 : 1))
      .slice(0, 2)
      .map((i) => `${i.item} (${i.quantity})`)
      .join('; ');

    return {
      id: org.id,
      name: org.name,
      location: normalizeLocation(org.location),
      demandCategories: demandCategories.length ? demandCategories : ['mixed_items'],
      needLevel,
      urgencyLabel,
      currentGap: org.emergencyReason?.trim() || topItems || 'Active needs posted on Browse Needs.',
    };
  });

  return mapped.length >= 2 ? mapped : NGO_DEMAND_CATALOG;
}
