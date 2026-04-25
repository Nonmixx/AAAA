import { getSupabaseServerClientOrNull } from '@/lib/supabase/server';
import { parseNeedImageUrls } from '@/lib/media';
import { compareNeedPriority } from '@/lib/needPriority';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOrganizationUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/** Row shape for the public browse list (matches `ReceiverNeedsList` mock cards). */
export type PublicBrowseReceiver = {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  organizationLogoUrl?: string | null;
  emergency: boolean;
  emergencyReason: string;
  items: { item: string; quantity: number; urgency: 'high' | 'medium' | 'low'; imageUrl?: string | null; imageUrls?: string[] }[];
};

export type PublicOrganizationRow = {
  id: string;
  name: string;
  logo_url?: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  verification_status: string;
  is_emergency: boolean;
  emergency_reason: string | null;
  contact_email: string;
  contact_phone: string | null;
};

export type PublicNeedRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  urgency: 'low' | 'medium' | 'high';
  is_emergency: boolean;
  needed_by: string | null;
  image_url?: string | null;
  image_urls?: string[];
};

export type PublicOrganizationDetail = {
  organization: PublicOrganizationRow;
  needs: PublicNeedRow[];
};

export type PublicNeedWithOrganization = PublicNeedRow & {
  organization: Pick<
    PublicOrganizationRow,
    'id' | 'name' | 'location_name' | 'address' | 'latitude' | 'longitude' | 'verification_status' | 'is_emergency' | 'emergency_reason'
  >;
};

type NeedWithOrgJoin = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  urgency: 'low' | 'medium' | 'high';
  is_emergency: boolean;
  needed_by: string | null;
  image_url: string | null;
  organizations: PublicOrganizationRow;
};

function mapUrgency(u: string): 'high' | 'medium' | 'low' {
  if (u === 'high' || u === 'medium' || u === 'low') return u;
  return 'medium';
}

function orgLocation(org: PublicOrganizationRow): string {
  return org.location_name?.trim() || org.address?.trim() || 'Location on file';
}

/**
 * Active, published needs joined to their organization for the public browse page.
 * Requires RLS that allows anon to read `organizations` with active listings
 * (see `supabase/migrations/20260424120000_public_organizations_read_for_listings.sql`).
 */
export async function fetchPublicBrowseReceivers(): Promise<PublicBrowseReceiver[]> {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('needs')
    .select(
      `
      id,
      created_at,
      title,
      description,
      category,
      quantity_requested,
      quantity_fulfilled,
      urgency,
      is_emergency,
      needed_by,
      image_url,
      organizations!inner (
        id,
        name,
        logo_url,
        location_name,
        address,
        latitude,
        longitude,
        description,
        verification_status,
        is_emergency,
        emergency_reason,
        contact_email,
        contact_phone
      )
    `
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const rows = data as unknown as NeedWithOrgJoin[];

  const visible = rows.filter((r) => {
    const org = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations;
    return Boolean(org?.id);
  });
  if (!visible.length) return [];

  const byOrg = new Map<string, { org: PublicOrganizationRow; needs: PublicNeedRow[] }>();

  for (const row of visible) {
    const org = (Array.isArray(row.organizations) ? row.organizations[0] : row.organizations) as
      | PublicOrganizationRow
      | undefined;
    if (!org?.id) continue;

    const need: PublicNeedRow = {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      quantity_requested: row.quantity_requested,
      quantity_fulfilled: row.quantity_fulfilled,
      urgency: mapUrgency(row.urgency),
      is_emergency: row.is_emergency,
      needed_by: row.needed_by,
      image_url: row.image_url,
      image_urls: parseNeedImageUrls(row.image_url),
    };

    const existing = byOrg.get(org.id);
    if (existing) {
      existing.needs.push(need);
    } else {
      byOrg.set(org.id, { org, needs: [need] });
    }
  }

  const cards: PublicBrowseReceiver[] = [];

  for (const { org, needs } of byOrg.values()) {
    const emergency = org.is_emergency || needs.some((n) => n.is_emergency);
    const emergencyReason =
      org.emergency_reason?.trim() ||
      needs.find((n) => n.is_emergency)?.description?.slice(0, 120) ||
      '';

    cards.push({
      id: org.id,
      name: org.name,
      location: orgLocation(org),
      latitude: org.latitude,
      longitude: org.longitude,
      organizationLogoUrl: org.logo_url ?? null,
      emergency,
      emergencyReason,
      items: needs.map((n) => ({
        item: n.title,
        quantity: Math.max(0, n.quantity_requested - n.quantity_fulfilled),
        urgency: mapUrgency(n.urgency),
        imageUrl: n.image_urls?.[0] ?? n.image_url,
        imageUrls: n.image_urls ?? [],
      })),
    });
  }

  return cards.sort((a, b) => {
    const emergencyRank = Number(b.emergency) - Number(a.emergency);
    if (emergencyRank !== 0) return emergencyRank;
    return a.name.localeCompare(b.name);
  });
}

type PublicNeedCandidate = PublicNeedWithOrganization | null;

function isPublicNeedWithOrganization(need: PublicNeedCandidate): need is PublicNeedWithOrganization {
  return need !== null;
}

export async function fetchPublicActiveNeeds(): Promise<PublicNeedWithOrganization[]> {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('needs')
    .select(
      `
      id,
      title,
      description,
      category,
      quantity_requested,
      quantity_fulfilled,
      urgency,
      is_emergency,
      needed_by,
      image_url,
      organizations!inner (
        id,
        name,
        location_name,
        address,
        latitude,
        longitude,
        verification_status,
        is_emergency,
        emergency_reason
      )
    `
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];

  const mapped: PublicNeedCandidate[] = (data as unknown as NeedWithOrgJoin[])
    .map((row) => {
      const organization = (Array.isArray(row.organizations) ? row.organizations[0] : row.organizations) as
        | PublicOrganizationRow
        | undefined;
      if (!organization?.id) return null;

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        quantity_requested: row.quantity_requested,
        quantity_fulfilled: row.quantity_fulfilled,
        urgency: mapUrgency(row.urgency),
        is_emergency: row.is_emergency,
        needed_by: row.needed_by,
        image_url: row.image_url,
        image_urls: parseNeedImageUrls(row.image_url),
        organization: {
          id: organization.id,
          name: organization.name,
          location_name: organization.location_name,
          address: organization.address,
          latitude: organization.latitude,
          longitude: organization.longitude,
          verification_status: organization.verification_status,
          is_emergency: organization.is_emergency,
          emergency_reason: organization.emergency_reason,
        },
      } satisfies PublicNeedWithOrganization;
    });

  return mapped
    .filter(isPublicNeedWithOrganization)
    .sort((a, b) =>
      compareNeedPriority(
        {
          isEmergency: a.is_emergency || a.organization.is_emergency,
          urgency: a.is_emergency || a.organization.is_emergency ? 'high' : a.urgency,
          quantityRequested: a.quantity_requested,
          quantityFulfilled: a.quantity_fulfilled,
        },
        {
          isEmergency: b.is_emergency || b.organization.is_emergency,
          urgency: b.is_emergency || b.organization.is_emergency ? 'high' : b.urgency,
          quantityRequested: b.quantity_requested,
          quantityFulfilled: b.quantity_fulfilled,
        }
      )
    );
}

export async function fetchPublicOrganizationDetail(organizationId: string): Promise<PublicOrganizationDetail | null> {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) return null;

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select(
      'id, name, location_name, address, description, verification_status, is_emergency, emergency_reason, contact_email, contact_phone'
    )
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError || !org) return null;

  const { data: needs, error: needsError } = await supabase
    .from('needs')
    .select('id, title, description, category, quantity_requested, quantity_fulfilled, urgency, is_emergency, needed_by, image_url')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (needsError || !needs?.length) return null;

  const orgRow = org as PublicOrganizationRow;
  const needRows = (needs as PublicNeedRow[]).map((n) => ({
    ...n,
    urgency: mapUrgency(n.urgency),
    image_urls: parseNeedImageUrls(n.image_url),
  }));

  return { organization: orgRow, needs: needRows };
}
