import { NextResponse } from 'next/server';
import { computeFulfilledQuantity, FULFILLMENT_STATUSES } from '@/lib/needs/fulfillment';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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
      return NextResponse.json({ error: 'Only donor accounts can create item donations.' }, { status: 403 });
    }

    const body = (await req.json()) as {
      needId?: string;
      itemName?: string;
      quantity?: number;
      description?: string;
      conditionGrade?: 'good' | 'worn' | 'damaged';
      deliveryMethod?: 'platform_delivery' | 'self_delivery' | 'pickup';
    };

    if (!body.needId || !body.itemName?.trim()) {
      return NextResponse.json({ error: 'needId and itemName are required.' }, { status: 400 });
    }

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: need, error: needError } = await supabase
      .from('needs')
      .select('id, title, category, quantity_requested, quantity_fulfilled, status, organizations(name)')
      .eq('id', body.needId)
      .maybeSingle();

    if (needError) throw needError;
    if (!need || need.status !== 'active') {
      return NextResponse.json({ error: 'That need is no longer active.' }, { status: 400 });
    }

    const { data: activeAllocations, error: activeAllocationsError } = await supabase
      .from('donation_allocations')
      .select('allocated_quantity')
      .eq('need_id', need.id)
      .in('status', [...FULFILLMENT_STATUSES]);

    if (activeAllocationsError) throw activeAllocationsError;

    const currentFulfilled = computeFulfilledQuantity(
      Number(need.quantity_requested ?? 0),
      (activeAllocations ?? []) as Array<{ allocated_quantity: number | null }>,
    );
    const remaining = Math.max(0, Number(need.quantity_requested ?? 0) - currentFulfilled);
    if (remaining <= 0) {
      return NextResponse.json({ error: 'This need is already fully fulfilled.' }, { status: 400 });
    }

    if (quantity > remaining) {
      return NextResponse.json(
        { error: `Quantity exceeds the remaining unmet amount (${remaining}).` },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const organizationName =
      typeof need.organizations === 'object' && need.organizations && 'name' in need.organizations
        ? String((need.organizations as Record<string, unknown>).name ?? 'receiver')
        : 'receiver';

    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .insert({
        donor_profile_id: user.id,
        item_name: body.itemName.trim(),
        category: need.category ?? null,
        description: body.description?.trim() || `Donor selected this item for need "${need.title}" at ${organizationName}.`,
        condition_grade: body.conditionGrade ?? 'good',
        quantity_total: quantity,
        source_type: 'manual',
        status: 'allocated',
        delivery_method: body.deliveryMethod ?? 'platform_delivery',
        ai_match_summary: {
          selectedNeedId: need.id,
          selectedNeedTitle: need.title,
          selectedByDonor: true,
        },
      })
      .select('*')
      .single();

    if (donationError) throw donationError;

    const { data: allocation, error: allocationError } = await supabase
      .from('donation_allocations')
      .insert({
        donation_id: donation.id,
        need_id: need.id,
        allocated_quantity: quantity,
        status: 'pending',
        delivery_method: body.deliveryMethod ?? 'platform_delivery',
        match_score: 100,
        match_reason: `Donor explicitly selected the need "${need.title}" from the donor need detail page.`,
      })
      .select('*')
      .single();

    if (allocationError) throw allocationError;

    await supabase.from('donation_events').insert({
      donation_id: donation.id,
      allocation_id: allocation.id,
      event_type: 'donation_submitted',
      to_status: 'pending',
      actor_profile_id: user.id,
      payload: {
        selectedNeedId: need.id,
        selectedNeedTitle: need.title,
      },
    });

    return NextResponse.json(
      {
        donation,
        allocation,
        message: `Donation submitted for ${organizationName}. The receiver can now review it in Incoming Donations.`,
        createdAt: now,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create donation from need.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
