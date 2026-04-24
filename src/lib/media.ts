export type NeedMediaSource = 'need-image' | 'organization-logo' | 'placeholder';

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
