import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { FULFILLMENT_STATUSES, mergeFulfillmentIntoNeeds } from '@/lib/needs/fulfillment';

export async function GET(
  _req: Request,
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
    if (!profile || (profile.role !== 'donor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Only donor accounts can access donor needs.' }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: need, error: needError } = await supabase
      .from('needs')
      .select('id, organization_id, disaster_event_id, title, description, category, image_url, quantity_requested, quantity_fulfilled, urgency, status, organizations(id, name, address, description, contact_email, contact_phone, logo_url, verification_status, is_emergency, emergency_reason)')
      .eq('id', id)
      .maybeSingle();

    if (needError) throw needError;
    if (!need) {
      return NextResponse.json({ error: 'Need not found.' }, { status: 404 });
    }

    const { data: siblingNeeds, error: siblingNeedsError } = await supabase
      .from('needs')
      .select('id, organization_id, disaster_event_id, title, description, category, image_url, quantity_requested, quantity_fulfilled, urgency, status, organizations(id, name, address, description, contact_email, contact_phone, logo_url, verification_status, is_emergency, emergency_reason)')
      .eq('organization_id', need.organization_id)
      .order('created_at', { ascending: false });

    if (siblingNeedsError) throw siblingNeedsError;

    const allNeeds = (siblingNeeds ?? []) as Array<{
      id: string;
      organization_id: string;
      disaster_event_id?: string | null;
      quantity_requested: number | null;
      quantity_fulfilled: number | null;
      status: string | null;
    } & Record<string, unknown>>;

    const needIds = allNeeds.map((row) => row.id);
    const { data: allocations, error: allocationsError } = needIds.length
      ? await supabase
          .from('donation_allocations')
          .select('need_id, allocated_quantity')
          .in('need_id', needIds)
          .in('status', [...FULFILLMENT_STATUSES])
      : { data: [], error: null };

    if (allocationsError) throw allocationsError;

    const hydratedNeeds = mergeFulfillmentIntoNeeds(
      allNeeds,
      (allocations ?? []) as Array<{ need_id: string; allocated_quantity: number | null }>,
    );

    const currentNeed = hydratedNeeds.find((row) => row.id === id) ?? null;
    if (!currentNeed) {
      return NextResponse.json({ error: 'Need not found.' }, { status: 404 });
    }

    return NextResponse.json({
      need: currentNeed,
      organizationNeeds: hydratedNeeds.filter((row) => row.status === 'active'),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load need details.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
