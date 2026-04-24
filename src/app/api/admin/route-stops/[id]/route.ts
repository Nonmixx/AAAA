import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const IN_PROGRESS_STATUSES = new Set(['arrived', 'proof_required']);

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authClient = await getSupabaseServerClient();
    await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const body = (await req.json()) as { status?: string };
    const { id } = await context.params;

    if (!body.status?.trim()) {
      return NextResponse.json({ error: 'status is required.' }, { status: 400 });
    }

    const { data: currentStop, error: currentStopError } = await supabase
      .from('route_stops')
      .select('id, route_plan_id, status')
      .eq('id', id)
      .single();

    if (currentStopError) throw currentStopError;

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status: body.status,
      updated_at: now,
    };

    if (body.status === 'arrived') {
      payload.arrived_at = now;
    }

    if (body.status === 'completed') {
      payload.completed_at = now;
    }

    const { data: routeStop, error: updateError } = await supabase
      .from('route_stops')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const { data: siblingStops, error: siblingStopsError } = await supabase
      .from('route_stops')
      .select('id, status')
      .eq('route_plan_id', currentStop.route_plan_id);

    if (siblingStopsError) throw siblingStopsError;

    const allCompleted = (siblingStops ?? []).every((stop) => stop.status === 'completed');
    const shouldBeInProgress = (siblingStops ?? []).some((stop) => IN_PROGRESS_STATUSES.has(stop.status));

    const routePlanStatus = allCompleted ? 'completed' : shouldBeInProgress ? 'in_progress' : 'planned';

    await supabase
      .from('route_plans')
      .update({
        status: routePlanStatus,
        started_at: routePlanStatus === 'in_progress' ? now : undefined,
        completed_at: routePlanStatus === 'completed' ? now : null,
        updated_at: now,
      })
      .eq('id', currentStop.route_plan_id);

    return NextResponse.json({ routeStop });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update route stop.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
