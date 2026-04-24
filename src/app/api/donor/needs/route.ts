import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { FULFILLMENT_STATUSES, mergeFulfillmentIntoNeeds } from '@/lib/needs/fulfillment';

export async function GET() {
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
      return NextResponse.json({ error: 'Only donor accounts can access donor needs.' }, { status: 403 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: needs, error: needsError } = await supabase
      .from('needs')
      .select('id, disaster_event_id, title, description, category, image_url, quantity_requested, quantity_fulfilled, urgency, status, organizations(id, name, address, logo_url, verification_status, is_emergency, emergency_reason)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (needsError) throw needsError;

    const needIds = (needs ?? []).map((need) => need.id);
    const { data: allocations, error: allocationsError } = needIds.length
      ? await supabase
          .from('donation_allocations')
          .select('need_id, allocated_quantity')
          .in('need_id', needIds)
          .in('status', [...FULFILLMENT_STATUSES])
      : { data: [], error: null };

    if (allocationsError) throw allocationsError;

    const hydratedNeeds = mergeFulfillmentIntoNeeds(
      (needs ?? []) as Array<{
        id: string;
        disaster_event_id?: string | null;
        quantity_requested: number | null;
        quantity_fulfilled: number | null;
        status: string | null;
      } & Record<string, unknown>>,
      (allocations ?? []) as Array<{ need_id: string; allocated_quantity: number | null }>,
    );

    return NextResponse.json({ needs: hydratedNeeds.filter((need) => need.status === 'active') });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load donor needs.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
