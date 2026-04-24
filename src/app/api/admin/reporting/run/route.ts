import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const authClient = await getSupabaseServerClient();
    const profile = await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const body = (await req.json().catch(() => ({}))) as { disasterEventId?: string };

    const { data: platformStatus } = await supabase
      .from('platform_status')
      .select('active_disaster_event_id')
      .eq('status_key', 'primary')
      .maybeSingle();

    const disasterEventId = body.disasterEventId ?? platformStatus?.active_disaster_event_id ?? null;
    if (!disasterEventId) {
      return NextResponse.json({ error: 'No active disaster event found.' }, { status: 400 });
    }

    const [
      needsResult,
      allocationsResult,
      routesResult,
      proofsResult,
      alertsResult,
      communicationsResult,
    ] = await Promise.all([
      supabase
        .from('needs')
        .select('id, quantity_requested, quantity_fulfilled')
        .eq('disaster_event_id', disasterEventId),
      supabase
        .from('donation_allocations')
        .select('id, status, need_id')
        .in(
          'need_id',
          (
            await supabase.from('needs').select('id').eq('disaster_event_id', disasterEventId)
          ).data?.map((need) => need.id) ?? [],
        ),
      supabase.from('route_plans').select('id, status').eq('disaster_event_id', disasterEventId),
      supabase.from('delivery_proofs').select('id, proof_verification_status'),
      supabase.from('equity_alerts').select('id, severity').eq('disaster_event_id', disasterEventId),
      supabase.from('communications').select('id, direction').eq('disaster_event_id', disasterEventId),
    ]);

    for (const result of [
      needsResult,
      allocationsResult,
      routesResult,
      proofsResult,
      alertsResult,
      communicationsResult,
    ]) {
      if (result.error) throw result.error;
    }

    const totalRequested = (needsResult.data ?? []).reduce(
      (sum, need) => sum + Number(need.quantity_requested ?? 0),
      0,
    );
    const totalFulfilled = (needsResult.data ?? []).reduce(
      (sum, need) => sum + Number(need.quantity_fulfilled ?? 0),
      0,
    );

    const summary = {
      needsCount: needsResult.data?.length ?? 0,
      allocationsCount: allocationsResult.data?.length ?? 0,
      routePlansCount: routesResult.data?.length ?? 0,
      completedRoutes: (routesResult.data ?? []).filter((route) => route.status === 'completed').length,
      proofsCount: proofsResult.data?.length ?? 0,
      verifiedProofs: (proofsResult.data ?? []).filter((proof) => proof.proof_verification_status === 'verified')
        .length,
      equityAlerts: alertsResult.data?.length ?? 0,
      inboundMessages: (communicationsResult.data ?? []).filter((item) => item.direction === 'inbound').length,
      outboundMessages: (communicationsResult.data ?? []).filter((item) => item.direction === 'outbound').length,
      totalRequested,
      totalFulfilled,
      fulfillmentRatio: totalRequested > 0 ? Number((totalFulfilled / totalRequested).toFixed(4)) : 1,
    };

    const { data: reportRun, error } = await supabase
      .from('report_runs')
      .insert({
        disaster_event_id: disasterEventId,
        report_type: 'operational_summary',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        summary,
        created_by: profile.id,
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ reportRun }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate report.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
