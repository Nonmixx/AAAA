import { NextResponse } from 'next/server';
import { computeFulfilledQuantity, FULFILLMENT_STATUSES } from '@/lib/needs/fulfillment';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type DonationStatus =
  | 'pending'
  | 'accepted'
  | 'scheduled'
  | 'in_transit'
  | 'delivered'
  | 'proof_uploaded'
  | 'confirmed'
  | 'rejected';

const ALLOWED_TARGETS = new Set<DonationStatus>(['accepted', 'rejected', 'confirmed']);
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authClient = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile || (profile.role !== 'receiver' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Only receiver accounts can update incoming donations.' }, { status: 403 });
    }

    const body = (await req.json()) as { status?: DonationStatus };
    if (!body.status || !ALLOWED_TARGETS.has(body.status)) {
      return NextResponse.json({ error: 'Unsupported status update.' }, { status: 400 });
    }

    const { data: ownedOrganization, error: ownedOrgError } = await authClient
      .from('organizations')
      .select('id')
      .eq('owner_profile_id', user.id)
      .maybeSingle();

    if (ownedOrgError) throw ownedOrgError;

    let organizationId = ownedOrganization?.id ?? null;

    if (!organizationId) {
      const { data: membership, error: membershipError } = await authClient
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;
      organizationId = membership?.organization_id ?? null;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found for this receiver account.' }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: allocation, error: allocationError } = await supabase
      .from('donation_allocations')
      .select('id, donation_id, need_id, status, allocated_quantity, needs!inner(id, organization_id, quantity_requested, quantity_fulfilled, status)')
      .eq('id', id)
      .maybeSingle();

    if (allocationError) throw allocationError;
    if (!allocation) {
      return NextResponse.json({ error: 'Incoming donation not found.' }, { status: 404 });
    }

    const allocationOrgId =
      typeof allocation.needs === 'object' && allocation.needs && 'organization_id' in allocation.needs
        ? String((allocation.needs as Record<string, unknown>).organization_id ?? '')
        : '';

    if (!allocationOrgId || allocationOrgId !== organizationId) {
      return NextResponse.json({ error: 'You do not have access to update this incoming donation.' }, { status: 403 });
    }

    if (body.status === 'confirmed' && !['delivered', 'proof_uploaded'].includes(allocation.status)) {
      return NextResponse.json({ error: 'Only delivered donations can be confirmed.' }, { status: 400 });
    }

    if ((body.status === 'accepted' || body.status === 'rejected') && allocation.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending donations can be accepted or rejected.' }, { status: 400 });
    }

    const needRow = one(allocation.needs);
    const needRecord =
      needRow && typeof needRow === 'object' && 'quantity_requested' in needRow
        ? (needRow as {
            id: string;
            organization_id: string;
            quantity_requested: number;
            quantity_fulfilled: number;
            status: string;
          })
        : null;

    if (!needRecord) {
      return NextResponse.json({ error: 'Linked need not found for this allocation.' }, { status: 404 });
    }

    const updatePayload: Record<string, string> = { status: body.status };
    if (body.status === 'accepted') updatePayload.accepted_at = new Date().toISOString();
    if (body.status === 'rejected') updatePayload.rejected_at = new Date().toISOString();
    if (body.status === 'confirmed') updatePayload.confirmed_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('donation_allocations')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) throw updateError;

    if (body.status === 'accepted' || body.status === 'rejected' || body.status === 'confirmed') {
      const { data: activeAllocations, error: activeAllocationsError } = await supabase
        .from('donation_allocations')
        .select('allocated_quantity, status')
        .eq('need_id', needRecord.id)
        .in('status', FULFILLMENT_STATUSES);

      if (activeAllocationsError) throw activeAllocationsError;

      const recomputedFulfilled = computeFulfilledQuantity(
        Number(needRecord.quantity_requested ?? 0),
        (activeAllocations ?? []) as Array<{ allocated_quantity: number | null }>,
      );

      const nextNeedStatus =
        recomputedFulfilled >= Number(needRecord.quantity_requested ?? 0) ? 'fulfilled' : 'active';

      const { error: needUpdateError } = await supabase
        .from('needs')
        .update({
          quantity_fulfilled: recomputedFulfilled,
          status: nextNeedStatus,
        })
        .eq('id', needRecord.id);

      if (needUpdateError) throw needUpdateError;
    }

    const { error: eventError } = await supabase.from('donation_events').insert({
      donation_id: allocation.donation_id,
      allocation_id: id,
      event_type: 'allocation_status_changed',
      from_status: allocation.status,
      to_status: body.status,
      actor_profile_id: user.id,
    });

    if (eventError) throw eventError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update donation status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
