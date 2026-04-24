import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type GenericRow = Record<string, unknown>;

export async function GET() {
  try {
    const authClient = await getSupabaseServerClient();
    await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();

    const { data: platformStatus, error: platformStatusError } = await supabase
      .from('platform_status')
      .select('*')
      .eq('status_key', 'primary')
      .maybeSingle();

    if (platformStatusError) throw platformStatusError;

    const activeDisasterEventId =
      platformStatus && typeof platformStatus.active_disaster_event_id === 'string'
        ? platformStatus.active_disaster_event_id
        : null;

    const [
      eventsResult,
      signalsResult,
      shelterContactsResult,
      communicationsResult,
      collectionPointsResult,
      routePlansResult,
      equityAlertsResult,
      equityMetricsResult,
      campaignPostsResult,
      reportRunsResult,
      needsResult,
      proofsResult,
    ] = await Promise.all([
      supabase.from('disaster_events').select('*').order('created_at', { ascending: false }).limit(12),
      supabase.from('incident_signals').select('*').order('created_at', { ascending: false }).limit(20),
      supabase
        .from('shelter_contacts')
        .select(
          'id, organization_id, contact_name, phone, preferred_channel, is_primary, is_verified, created_at, organizations(id, name, address, organization_type, capacity, current_occupancy, contact_person, operational_status, latitude, longitude)',
        )
        .order('created_at', { ascending: false })
        .limit(50),
      activeDisasterEventId
        ? supabase
            .from('communications')
            .select('*')
            .eq('disaster_event_id', activeDisasterEventId)
            .order('created_at', { ascending: false })
            .limit(50)
        : supabase.from('communications').select('*').order('created_at', { ascending: false }).limit(50),
      activeDisasterEventId
        ? supabase
            .from('collection_points')
            .select('*')
            .eq('disaster_event_id', activeDisasterEventId)
            .order('created_at', { ascending: false })
            .limit(30)
        : supabase.from('collection_points').select('*').order('created_at', { ascending: false }).limit(30),
      activeDisasterEventId
        ? supabase
            .from('route_plans')
            .select('*')
            .eq('disaster_event_id', activeDisasterEventId)
            .order('created_at', { ascending: false })
            .limit(20)
        : supabase.from('route_plans').select('*').order('created_at', { ascending: false }).limit(20),
      activeDisasterEventId
        ? supabase
            .from('equity_alerts')
            .select('*')
            .eq('disaster_event_id', activeDisasterEventId)
            .order('created_at', { ascending: false })
            .limit(20)
        : supabase.from('equity_alerts').select('*').order('created_at', { ascending: false }).limit(20),
      activeDisasterEventId
        ? supabase
            .from('equity_metrics')
            .select('*')
            .eq('disaster_event_id', activeDisasterEventId)
            .order('computed_at', { ascending: false })
            .limit(40)
        : supabase.from('equity_metrics').select('*').order('computed_at', { ascending: false }).limit(40),
      activeDisasterEventId
        ? supabase
            .from('campaign_posts')
            .select('*')
            .eq('disaster_event_id', activeDisasterEventId)
            .order('created_at', { ascending: false })
            .limit(20)
        : supabase.from('campaign_posts').select('*').order('created_at', { ascending: false }).limit(20),
      activeDisasterEventId
        ? supabase
            .from('report_runs')
            .select('*')
            .eq('disaster_event_id', activeDisasterEventId)
            .order('created_at', { ascending: false })
            .limit(20)
        : supabase.from('report_runs').select('*').order('created_at', { ascending: false }).limit(20),
      activeDisasterEventId
        ? supabase
            .from('needs')
            .select(
              'id, organization_id, disaster_event_id, title, category, quantity_requested, quantity_fulfilled, urgency, is_emergency, beneficiary_count, source, created_at, organizations(name, address, operational_status)',
            )
            .eq('disaster_event_id', activeDisasterEventId)
            .order('created_at', { ascending: false })
            .limit(60)
        : supabase.from('needs').select('id').limit(0),
      supabase
        .from('delivery_proofs')
        .select(
          'id, allocation_id, image_url, proof_timestamp, location_text, proof_verification_status, verification_confidence, verification_notes, confirmed_at, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    for (const result of [
      eventsResult,
      signalsResult,
      shelterContactsResult,
      communicationsResult,
      collectionPointsResult,
      routePlansResult,
      equityAlertsResult,
      equityMetricsResult,
      campaignPostsResult,
      reportRunsResult,
      needsResult,
      proofsResult,
    ]) {
      if (result.error) throw result.error;
    }

    const routePlans = (routePlansResult.data ?? []) as GenericRow[];
    const routePlanIds = routePlans
      .map((plan) => (typeof plan.id === 'string' ? plan.id : null))
      .filter(Boolean) as string[];

    const routeStopsResult = routePlanIds.length
      ? await supabase
          .from('route_stops')
          .select(
            'id, route_plan_id, stop_order, stop_type, collection_point_id, organization_id, address, expected_quantity, status, eta_at, arrived_at, completed_at, metadata, organizations(name), collection_points(name)',
          )
          .in('route_plan_id', routePlanIds)
          .order('stop_order', { ascending: true })
      : { data: [], error: null };

    if (routeStopsResult.error) throw routeStopsResult.error;

    const proofs = (proofsResult.data ?? []) as GenericRow[];
    const allocationIds = proofs
      .map((proof) => (typeof proof.allocation_id === 'string' ? proof.allocation_id : null))
      .filter(Boolean) as string[];

    const allocationsResult = allocationIds.length
      ? await supabase
          .from('donation_allocations')
          .select('id, need_id, donation_id, status')
          .in('id', allocationIds)
      : { data: [], error: null };

    if (allocationsResult.error) throw allocationsResult.error;

    const allocations = (allocationsResult.data ?? []) as GenericRow[];
    const donationIds = allocations
      .map((allocation) => (typeof allocation.donation_id === 'string' ? allocation.donation_id : null))
      .filter(Boolean) as string[];
    const needIds = allocations
      .map((allocation) => (typeof allocation.need_id === 'string' ? allocation.need_id : null))
      .filter(Boolean) as string[];

    const [donationsResult, proofNeedsResult] = await Promise.all([
      donationIds.length
        ? supabase.from('donations').select('id, item_name').in('id', donationIds)
        : Promise.resolve({ data: [], error: null }),
      needIds.length
        ? supabase.from('needs').select('id, title, organization_id').in('id', needIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (donationsResult.error) throw donationsResult.error;
    if (proofNeedsResult.error) throw proofNeedsResult.error;

    const proofNeeds = (proofNeedsResult.data ?? []) as GenericRow[];
    const proofOrganizationIds = proofNeeds
      .map((need) => (typeof need.organization_id === 'string' ? need.organization_id : null))
      .filter(Boolean) as string[];

    const proofOrganizationsResult = proofOrganizationIds.length
      ? await supabase.from('organizations').select('id, name').in('id', proofOrganizationIds)
      : { data: [], error: null };

    if (proofOrganizationsResult.error) throw proofOrganizationsResult.error;

    const needs = (needsResult.data ?? []) as GenericRow[];
    const communications = (communicationsResult.data ?? []) as GenericRow[];
    const shelterContacts = (shelterContactsResult.data ?? []) as GenericRow[];

    const routeStopsByPlan = new Map<string, GenericRow[]>();
    for (const stop of (routeStopsResult.data ?? []) as GenericRow[]) {
      const planId = typeof stop.route_plan_id === 'string' ? stop.route_plan_id : null;
      if (!planId) continue;
      const current = routeStopsByPlan.get(planId) ?? [];
      current.push(stop);
      routeStopsByPlan.set(planId, current);
    }

    const needCountsByOrganization = new Map<string, number>();
    for (const need of needs) {
      const organizationId = typeof need.organization_id === 'string' ? need.organization_id : null;
      if (!organizationId) continue;
      needCountsByOrganization.set(organizationId, (needCountsByOrganization.get(organizationId) ?? 0) + 1);
    }

    const latestInboundByOrganization = new Map<string, GenericRow>();
    for (const communication of communications) {
      const organizationId = typeof communication.organization_id === 'string' ? communication.organization_id : null;
      if (!organizationId) continue;
      if (communication.direction !== 'inbound') continue;
      if (!latestInboundByOrganization.has(organizationId)) {
        latestInboundByOrganization.set(organizationId, communication);
      }
    }

    const shelters = shelterContacts.map((contact) => {
      const organization =
        typeof contact.organizations === 'object' && contact.organizations
          ? (contact.organizations as GenericRow)
          : null;
      const organizationId = typeof contact.organization_id === 'string' ? contact.organization_id : null;
      return {
        ...contact,
        activeNeedCount: organizationId ? needCountsByOrganization.get(organizationId) ?? 0 : 0,
        latestInboundCommunication: organizationId ? latestInboundByOrganization.get(organizationId) ?? null : null,
        organization,
      };
    });

    const donationMap = new Map(
      ((donationsResult.data ?? []) as GenericRow[]).map((donation) => [String(donation.id), donation]),
    );
    const needMap = new Map(proofNeeds.map((need) => [String(need.id), need]));
    const organizationMap = new Map(
      ((proofOrganizationsResult.data ?? []) as GenericRow[]).map((organization) => [String(organization.id), organization]),
    );

    const enrichedProofs: Array<GenericRow & {
      allocation: GenericRow | null;
      donation: GenericRow | null;
      need: GenericRow | null;
      organization: GenericRow | null;
    }> = proofs.map((proof) => {
      const allocation = allocations.find((item) => item.id === proof.allocation_id) ?? null;
      const donation =
        allocation && typeof allocation.donation_id === 'string'
          ? donationMap.get(allocation.donation_id) ?? null
          : null;
      const need =
        allocation && typeof allocation.need_id === 'string' ? needMap.get(allocation.need_id) ?? null : null;
      const organization =
        need && typeof need.organization_id === 'string'
          ? organizationMap.get(need.organization_id) ?? null
          : null;

      return {
        ...proof,
        allocation,
        donation,
        need,
        organization,
      };
    });

    const enrichedRoutePlans = routePlans.map((plan) => ({
      ...plan,
      stops: routeStopsByPlan.get(String(plan.id)) ?? [],
    }));

    return NextResponse.json({
      platformStatus,
      activeEvent:
        (eventsResult.data ?? []).find((event) => event.id === activeDisasterEventId) ?? null,
      events: eventsResult.data ?? [],
      signals: eventsResult.data ? signalsResult.data ?? [] : [],
      shelters,
      communications,
      collectionPoints: collectionPointsResult.data ?? [],
      needs,
      routePlans: enrichedRoutePlans,
      equityAlerts: equityAlertsResult.data ?? [],
      equityMetrics: equityMetricsResult.data ?? [],
      campaignPosts: campaignPostsResult.data ?? [],
      reportRuns: reportRunsResult.data ?? [],
      proofs: enrichedProofs,
      stats: {
        inboundMessages: communications.filter((item) => item.direction === 'inbound').length,
        outboundMessages: communications.filter((item) => item.direction === 'outbound').length,
        verifiedShelterContacts: shelterContacts.filter((item) => item.is_verified === true).length,
        activeNeeds: needs.length,
        routePlans: enrichedRoutePlans.length,
        pendingProofs: enrichedProofs.filter((proof) => proof.proof_verification_status === 'pending').length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load workflow center.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
