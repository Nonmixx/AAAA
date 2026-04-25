export type NeedMediaSource = 'need-image' | 'organization-logo' | 'placeholder';
export const DEFAULT_NEED_IMAGE =
  'https://images.unsplash.com/photo-1608979827489-2b855e79debe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

const NEED_DEFAULT_BY_KEYWORD: Array<{ pattern: RegExp; image: string }> = [
  {
    pattern: /(food|meal|rice|grocery|pack|nutrition|formula|water)/i,
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    pattern: /(medical|medicine|clinic|health|wheelchair|first aid)/i,
    image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    pattern: /(book|school|education|study|library|stationery|kit)/i,
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    pattern: /(clothing|blanket|hygiene|soap|toiletries|shelter)/i,
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
];

export function getOrganizationInitials(name?: string | null) {
  if (!name) return 'NA';

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'NA';
}

export function getNeedMediaSource(needImageUrl?: string | null, organizationLogoUrl?: string | null): NeedMediaSource {
  if (needImageUrl) return 'need-image';
  if (organizationLogoUrl) return 'organization-logo';
  return 'placeholder';
}

export function getNeedDisplayImage(needImageUrl?: string | null, organizationLogoUrl?: string | null) {
  return needImageUrl || organizationLogoUrl || null;
}

/**
 * Supports:
 * - single URL
 * - JSON string array of URLs
 * - comma/newline separated URLs
 */
export function parseNeedImageUrls(raw?: string | null): string[] {
  const value = raw?.trim();
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  } catch {
    // Not JSON; continue below.
  }

  if (/^https?:\/\//i.test(value)) return [value];

  return value
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter((part) => /^https?:\/\//i.test(part));
}

export function getContextualDefaultNeedImage(context?: string | null) {
  const input = context?.trim() || '';
  for (const item of NEED_DEFAULT_BY_KEYWORD) {
    if (item.pattern.test(input)) return item.image;
  }
  return DEFAULT_NEED_IMAGE;
}
