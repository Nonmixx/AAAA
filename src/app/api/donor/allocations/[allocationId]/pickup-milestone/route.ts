import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Milestones = {
  driver_assigned_at?: string | null;
  picked_up_from_donor_at?: string | null;
  en_route_at?: string | null;
  delivered_at?: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Advances donor pickup logistics (stored in donation_allocations.routing_notes.donor_logistics).
 * Uses the service role after verifying the signed-in donor owns the parent donation.
 */
export async function POST(_req: Request, context: { params: Promise<{ allocationId: string }> }) {
  try {
    const { allocationId } = await context.params;
    if (!isUuid(allocationId)) {
      return NextResponse.json({ error: 'Invalid allocation id.' }, { status: 400 });
    }

    const authClient = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    const { data: allocation, error: allocError } = await admin
      .from('donation_allocations')
      .select('id, donation_id, status, routing_notes, delivered_at')
      .eq('id', allocationId)
      .maybeSingle();

    if (allocError) throw allocError;
    if (!allocation) {
      return NextResponse.json({ error: 'Allocation not found.' }, { status: 404 });
    }

    const { data: donation, error: donationError } = await admin
      .from('donations')
      .select('id, donor_profile_id, delivery_method')
      .eq('id', allocation.donation_id)
      .maybeSingle();

    if (donationError) throw donationError;
    if (!donation || donation.donor_profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (donation.delivery_method !== 'platform_delivery') {
      return NextResponse.json({ error: 'Pickup milestones apply only to platform pickup donations.' }, { status: 400 });
    }

    const notes = (allocation.routing_notes ?? {}) as Record<string, unknown>;
    const logistics = notes.donor_logistics as Record<string, unknown> | undefined;
    if (!logistics || logistics.self_dropoff) {
      return NextResponse.json({ error: 'No donor pickup logistics on this allocation.' }, { status: 400 });
    }

    const milestones = { ...(logistics.milestones as Milestones | undefined) } as Milestones;
    const nowIso = new Date().toISOString();

    if (!milestones.picked_up_from_donor_at) {
      milestones.picked_up_from_donor_at = nowIso;
    } else if (!milestones.en_route_at) {
      milestones.en_route_at = nowIso;
    } else if (!milestones.delivered_at) {
      milestones.delivered_at = nowIso;
    } else {
      return NextResponse.json({ error: 'All pickup milestones are already complete.' }, { status: 400 });
    }

    const nextRoutingNotes = {
      ...notes,
      donor_logistics: {
        ...logistics,
        milestones,
      },
    };

    const { data: updated, error: updateError } = await admin
      .from('donation_allocations')
      .update({
        routing_notes: nextRoutingNotes,
        updated_at: nowIso,
      })
      .eq('id', allocationId)
      .select('id, status, routing_notes, delivered_at')
      .single();

    if (updateError) throw updateError;

    await admin.from('donation_events').insert({
      donation_id: allocation.donation_id,
      allocation_id: allocationId,
      event_type: 'donor_pickup_milestone',
      from_status: allocation.status,
      to_status: updated.status,
      actor_profile_id: user.id,
      payload: {
        milestones,
        source: 'donor_pickup_milestone_api',
      },
    });

    return NextResponse.json({ allocation: updated }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to advance pickup milestone.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
