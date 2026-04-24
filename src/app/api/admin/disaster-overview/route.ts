import { NextResponse } from 'next/server';
import { getPlatformStatus, requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const authClient = await getSupabaseServerClient();
    await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const platformStatus = await getPlatformStatus(supabase);
    const activeDisasterEventId = platformStatus?.active_disaster_event_id ?? null;

    const [
      eventsResult,
      signalsResult,
      alertsResult,
      collectionPointsResult,
      shelterContactsCountResult,
      routePlansCountResult,
      communicationsCountResult,
      activeNeedsResult,
    ] = await Promise.all([
      supabase.from('disaster_events').select('*').order('created_at', { ascending: false }).limit(12),
      supabase.from('incident_signals').select('*').order('created_at', { ascending: false }).limit(12),
      supabase.from('equity_alerts').select('*').order('created_at', { ascending: false }).limit(12),
      supabase.from('collection_points').select('id, name, status, current_load, capacity').order('created_at', { ascending: false }).limit(12),
      supabase.from('shelter_contacts').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('route_plans').select('*', { count: 'exact', head: true }),
      supabase.from('communications').select('*', { count: 'exact', head: true }),
      activeDisasterEventId
        ? supabase
            .from('needs')
            .select('id')
            .eq('disaster_event_id', activeDisasterEventId)
            .eq('status', 'active')
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (eventsResult.error) throw eventsResult.error;
    if (signalsResult.error) throw signalsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (collectionPointsResult.error) throw collectionPointsResult.error;
    if (shelterContactsCountResult.error) throw shelterContactsCountResult.error;
    if (routePlansCountResult.error) throw routePlansCountResult.error;
    if (communicationsCountResult.error) throw communicationsCountResult.error;
    if (activeNeedsResult.error) throw activeNeedsResult.error;

    const activeNeedIds = (activeNeedsResult.data ?? []).map((need) => need.id);
    const [pendingAllocationsCountResult, scheduledAllocationsCountResult] = activeNeedIds.length
      ? await Promise.all([
          supabase
            .from('donation_allocations')
            .select('id', { count: 'exact', head: true })
            .in('need_id', activeNeedIds)
            .eq('delivery_method', 'platform_delivery')
            .in('status', ['pending', 'accepted'])
            .is('scheduled_at', null),
          supabase
            .from('donation_allocations')
            .select('id', { count: 'exact', head: true })
            .in('need_id', activeNeedIds)
            .eq('delivery_method', 'platform_delivery')
            .not('scheduled_at', 'is', null),
        ])
      : [{ count: 0, error: null }, { count: 0, error: null }];

    if (pendingAllocationsCountResult.error) throw pendingAllocationsCountResult.error;
    if (scheduledAllocationsCountResult.error) throw scheduledAllocationsCountResult.error;

    return NextResponse.json({
      platformStatus,
      events: eventsResult.data ?? [],
      signals: signalsResult.data ?? [],
      equityAlerts: alertsResult.data ?? [],
      collectionPoints: collectionPointsResult.data ?? [],
      stats: {
        verifiedShelterContacts: shelterContactsCountResult.count ?? 0,
        activeNeedsForEvent: activeNeedIds.length,
        pendingPlatformAllocationsForEvent: pendingAllocationsCountResult.count ?? 0,
        scheduledPlatformAllocationsForEvent: scheduledAllocationsCountResult.count ?? 0,
        routePlans: routePlansCountResult.count ?? 0,
        communications: communicationsCountResult.count ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load admin overview.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
