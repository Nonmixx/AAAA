import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type ConfirmAllocation = {
  needId: string;
  percent: number;
  reason: string[];
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function splitQuantities(total: number, rows: ConfirmAllocation[]) {
  const safeTotal = Math.max(1, Math.round(total));
  const allocations = rows.map((row) => ({
    ...row,
    allocatedQuantity: Math.floor((safeTotal * Math.max(0, row.percent)) / 100),
  }));

  let assigned = allocations.reduce((sum, row) => sum + row.allocatedQuantity, 0);
  let cursor = 0;
  while (assigned < safeTotal && allocations.length > 0) {
    allocations[cursor % allocations.length].allocatedQuantity += 1;
    assigned += 1;
    cursor += 1;
  }

  return allocations.filter((row) => row.allocatedQuantity > 0);
}

export async function POST(req: Request) {
  try {
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
    if (!profile || (profile.role !== 'donor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Only donor accounts can confirm AI donation plans.' }, { status: 403 });
    }

    const body = (await req.json()) as {
      itemName?: string;
      quantity?: number;
      description?: string;
      conditionGrade?: 'good' | 'worn' | 'damaged';
      deliveryMethod?: 'platform_delivery' | 'self_delivery';
      allocations?: ConfirmAllocation[];
      planSummary?: string;
      trackingSummary?: string;
      donorIntent?: string;
      urgencyEvaluation?: string;
    };

    if (!body.itemName?.trim()) {
      return NextResponse.json({ error: 'itemName is required.' }, { status: 400 });
    }

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0.' }, { status: 400 });
    }

    const liveAllocations = (body.allocations ?? []).filter((row) => isUuid(row.needId));
    if (!liveAllocations.length) {
      return NextResponse.json(
        { error: 'This plan is not linked to live needs yet. Activate a disaster event and publish shelter needs first.' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const needIds = liveAllocations.map((row) => row.needId);
    const { data: needs, error: needsError } = await supabase
      .from('needs')
      .select('id, title, category, disaster_event_id, quantity_requested, quantity_fulfilled, status')
      .in('id', needIds);

    if (needsError) throw needsError;
    if (!needs?.length) {
      return NextResponse.json({ error: 'No live needs found for this plan.' }, { status: 400 });
    }

    const activeNeeds = needs.filter((need) => need.status === 'active');
    if (!activeNeeds.length) {
      return NextResponse.json({ error: 'The selected needs are no longer active.' }, { status: 400 });
    }

    const disasterEventId = activeNeeds.find((need) => need.disaster_event_id)?.disaster_event_id ?? null;
    const quantities = splitQuantities(quantity, liveAllocations).filter((row) =>
      activeNeeds.some((need) => need.id === row.needId),
    );

    if (!quantities.length) {
      return NextResponse.json({ error: 'No valid live allocations remained after quantity split.' }, { status: 400 });
    }

    const primaryNeed = activeNeeds.find((need) => need.id === quantities[0]?.needId) ?? activeNeeds[0];
    const deliveryMethod = body.deliveryMethod ?? 'platform_delivery';
    const trackingSummary =
      body.trackingSummary?.trim() ||
      body.planSummary?.trim() ||
      null;
    const pickupRef = `PICKUP-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .insert({
        donor_profile_id: user.id,
        item_name: body.itemName.trim(),
        category: primaryNeed?.category ?? null,
        description:
          body.description?.trim() ||
          `AI donation workflow confirmed for ${body.itemName.trim()} across ${quantities.length} live need(s).`,
        condition_grade: body.conditionGrade ?? 'good',
        quantity_total: Math.round(quantity),
        source_type: 'ai',
        status: 'allocated',
        delivery_method: deliveryMethod,
        ai_match_summary: {
          donorIntent: body.donorIntent ?? null,
          urgencyEvaluation: body.urgencyEvaluation ?? null,
          planSummary: body.planSummary ?? null,
          trackingSummary,
          matchedNeedIds: quantities.map((row) => row.needId),
        },
      })
      .select('*')
      .single();

    if (donationError) throw donationError;

    const nowIso = new Date().toISOString();
    const allocationRows = quantities.map((row) => ({
      donation_id: donation.id,
      need_id: row.needId,
      allocated_quantity: row.allocatedQuantity,
      status: 'pending',
      delivery_method: deliveryMethod,
      match_score: row.percent,
      match_reason: row.reason?.join(' ') || 'Confirmed from AI donation workflow.',
      routing_notes:
        deliveryMethod === 'platform_delivery'
          ? {
              donor_logistics: {
                summary: trackingSummary,
                driver: {
                  displayName: 'Partner pickup driver',
                  reference: pickupRef,
                  phone: null as string | null,
                },
                milestones: {
                  driver_assigned_at: nowIso,
                  picked_up_from_donor_at: null,
                  en_route_at: null,
                  delivered_at: null,
                },
              },
            }
          : {
              donor_logistics: {
                summary: trackingSummary,
                self_dropoff: true,
                milestones: {},
              },
            },
    }));

    const { data: allocations, error: allocationsError } = await supabase
      .from('donation_allocations')
      .insert(allocationRows)
      .select('*');

    if (allocationsError) throw allocationsError;

    const { data: candidateCollectionPoint } = disasterEventId
      ? await supabase
          .from('collection_points')
          .select('id, name')
          .eq('disaster_event_id', disasterEventId)
          .eq('status', 'active')
          .order('current_load', { ascending: true })
          .limit(1)
          .maybeSingle()
      : { data: null };

    const assignmentReason =
      deliveryMethod === 'self_delivery'
        ? `Assigned to active collection point${candidateCollectionPoint?.name ? ` ${candidateCollectionPoint.name}` : ''} for donor drop-off.`
        : `Donor pickup scheduled via platform logistics${candidateCollectionPoint?.name ? ` (staging ${candidateCollectionPoint.name})` : ''}.`;

    const { data: collectionAssignment, error: assignmentError } = await supabase
      .from('collection_assignments')
      .insert({
        donation_id: donation.id,
        disaster_event_id: disasterEventId,
        assignment_type: deliveryMethod === 'self_delivery' ? 'dropoff' : 'pickup',
        collection_point_id: candidateCollectionPoint?.id ?? null,
        pickup_required: deliveryMethod === 'platform_delivery',
        pickup_status: deliveryMethod === 'platform_delivery' ? 'pending' : 'not_required',
        assignment_reason: assignmentReason,
        metadata: {
          createdBy: 'ai-donation-confirmation',
          allocationNeedIds: quantities.map((row) => row.needId),
          pickupReference: deliveryMethod === 'platform_delivery' ? pickupRef : null,
        },
      })
      .select('*')
      .single();

    if (assignmentError) throw assignmentError;

    const eventRows = allocations.map((allocation) => ({
      donation_id: donation.id,
      allocation_id: allocation.id,
      event_type: 'donation_submitted',
      to_status: 'pending',
      actor_profile_id: user.id,
      payload: {
        source: 'ai_donation_workflow',
        needId: allocation.need_id,
        collectionAssignmentId: collectionAssignment.id,
      },
    }));

    const { error: donationEventsError } = await supabase.from('donation_events').insert(eventRows);
    if (donationEventsError) throw donationEventsError;

    return NextResponse.json(
      {
        donation,
        allocations,
        collectionAssignment,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to confirm AI donation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

