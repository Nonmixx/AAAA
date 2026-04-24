import { createIncidentSignal, getPlatformStatus, runDetectionSweep } from './server';
import { geocodeAddress, getTravelEstimate } from './providers/maps';
import { fetchNadmaAlerts } from './providers/nadma';
import { fetchNewsSignals } from './providers/newsSources';
import { fetchSocialSignals } from './providers/socialSignals';
import { sendWhatsAppMessage } from './providers/whatsapp';
export async function ingestExternalSignals(supabase) {
    const [newsSignals, nadmaAlerts, socialSignals] = await Promise.allSettled([
        fetchNewsSignals(),
        fetchNadmaAlerts(),
        fetchSocialSignals(),
    ]);
    const created = [];
    if (newsSignals.status === 'fulfilled') {
        for (const signal of newsSignals.value) {
            created.push(await createIncidentSignal(supabase, {
                sourceType: 'news',
                sourceName: signal.sourceName,
                sourceRef: signal.sourceRef,
                normalizedText: `${signal.title}. ${signal.content}`,
                rawPayload: signal,
            }));
        }
    }
    if (nadmaAlerts.status === 'fulfilled') {
        for (const alert of nadmaAlerts.value) {
            created.push(await createIncidentSignal(supabase, {
                sourceType: 'nadma',
                sourceName: alert.sourceName,
                sourceRef: alert.sourceRef,
                normalizedText: `${alert.title}. ${alert.content}`,
                rawPayload: alert,
            }));
        }
    }
    if (socialSignals.status === 'fulfilled') {
        for (const post of socialSignals.value) {
            created.push(await createIncidentSignal(supabase, {
                sourceType: 'social',
                sourceName: post.sourceName,
                sourceRef: post.sourceRef,
                normalizedText: post.content,
                rawPayload: post,
            }));
        }
    }
    return created;
}
export async function previewExternalSignals() {
    const [newsSignals, nadmaAlerts, socialSignals] = await Promise.allSettled([
        fetchNewsSignals(),
        fetchNadmaAlerts(),
        fetchSocialSignals(),
    ]);
    return {
        newsSignals,
        nadmaAlerts,
        socialSignals,
    };
}
export async function runDisasterDetectionJob(supabase) {
    await ingestExternalSignals(supabase);
    return runDetectionSweep(supabase);
}
export async function sendShelterOutreach(supabase, disasterEventId) {
    const { data, error } = await supabase
        .from('shelter_contacts')
        .select('id, organization_id, contact_name, phone, is_primary')
        .eq('is_verified', true)
        .order('is_primary', { ascending: false });
    if (error)
        throw error;
    const sent = [];
    for (const contact of data ?? []) {
        if (!contact.phone)
            continue;
        const body = `Disaster response has been activated for event ${disasterEventId}. Please reply with your urgent needs, estimated beneficiary count, and any delivery constraints.`;
        const providerResponse = await sendWhatsAppMessage({ to: contact.phone, body });
        sent.push({ contactId: contact.id, providerResponse });
        await supabase.from('communications').insert({
            disaster_event_id: disasterEventId,
            organization_id: contact.organization_id,
            channel: 'whatsapp',
            direction: 'outbound',
            sender_role: 'system',
            recipient: contact.phone,
            transcript: body,
            provider_message_id: typeof providerResponse === 'object' && providerResponse && 'sid' in providerResponse
                ? String(providerResponse.sid)
                : null,
            message_status: 'sent',
            metadata: { contactId: contact.id },
        });
    }
    return sent;
}
export async function previewShelterOutreach(supabase, disasterEventId) {
    const { data, error } = await supabase
        .from('shelter_contacts')
        .select('id, organization_id, contact_name, phone, is_primary')
        .eq('is_verified', true)
        .order('is_primary', { ascending: false });
    if (error)
        throw error;
    return (data ?? [])
        .filter((contact) => Boolean(contact.phone))
        .map((contact) => ({
        contactId: contact.id,
        organizationId: contact.organization_id,
        phone: contact.phone,
        body: `Disaster response has been activated for event ${disasterEventId}. Please reply with your urgent needs, estimated beneficiary count, and any delivery constraints.`,
    }));
}
export async function recomputeEquityMetrics(supabase, disasterEventId) {
    const { data: needs, error } = await supabase
        .from('needs')
        .select('id, organization_id, category, quantity_requested, quantity_fulfilled, is_emergency, urgency')
        .eq('disaster_event_id', disasterEventId)
        .eq('status', 'active');
    if (error)
        throw error;
    const grouped = new Map();
    for (const need of needs ?? []) {
        const key = `${need.organization_id}:${need.category}`;
        const existing = grouped.get(key) ?? {
            organizationId: need.organization_id,
            category: need.category,
            requested: 0,
            fulfilled: 0,
            emergency: false,
        };
        existing.requested += need.quantity_requested ?? 0;
        existing.fulfilled += need.quantity_fulfilled ?? 0;
        existing.emergency ||= Boolean(need.is_emergency || need.urgency === 'high');
        grouped.set(key, existing);
    }
    for (const group of grouped.values()) {
        const ratio = group.requested > 0 ? group.fulfilled / group.requested : 1;
        const underservedScore = Number(((1 - ratio) * (group.emergency ? 1.5 : 1)).toFixed(4));
        await supabase.from('equity_metrics').insert({
            disaster_event_id: disasterEventId,
            organization_id: group.organizationId,
            category: group.category,
            requested_quantity: group.requested,
            fulfilled_quantity: group.fulfilled,
            fulfillment_ratio: ratio,
            underserved_score: underservedScore,
            metadata: { computedBy: 'deterministic-equity-job' },
        });
        if (underservedScore >= 0.5) {
            await supabase.from('equity_alerts').insert({
                disaster_event_id: disasterEventId,
                organization_id: group.organizationId,
                category: group.category,
                severity: underservedScore >= 0.8 ? 'high' : 'medium',
                alert_type: 'underserved',
                message: `Organization ${group.organizationId} is underserved for ${group.category}. Fulfillment ratio is ${(ratio * 100).toFixed(0)}%.`,
            });
        }
    }
}
export async function getActiveDisasterEventId(supabase) {
    const platformStatus = await getPlatformStatus(supabase);
    return platformStatus?.active_disaster_event_id ?? null;
}
function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
async function resolvePointLocation(address, latitude, longitude) {
    const lat = toNumber(latitude);
    const lng = toNumber(longitude);
    if (lat !== null && lng !== null)
        return { lat, lng };
    if (!address)
        return null;
    return geocodeAddress(address);
}
export async function createRoutePlan(supabase, options) {
    const collectionPointQuery = supabase
        .from('collection_points')
        .select('id, name, address, latitude, longitude, status')
        .eq('status', 'active')
        .order('current_load', { ascending: true })
        .limit(10);
    const { data: collectionPoints, error: collectionPointError } = options.collectionPointId
        ? await collectionPointQuery.eq('id', options.collectionPointId)
        : await collectionPointQuery;
    if (collectionPointError)
        throw collectionPointError;
    const collectionPoint = collectionPoints?.[0];
    if (!collectionPoint) {
        throw new Error('No active collection point with location data is available for route planning.');
    }
    const collectionPointLocation = await resolvePointLocation(collectionPoint.address ?? null, collectionPoint.latitude, collectionPoint.longitude);
    if (!collectionPointLocation) {
        throw new Error(`Collection point "${collectionPoint.name}" is missing a usable location.`);
    }
    const { data: needs, error: needsError } = await supabase
        .from('needs')
        .select('id, title, category, organization_id, disaster_event_id, organizations!inner(id, name, address, latitude, longitude)')
        .eq('disaster_event_id', options.disasterEventId)
        .eq('status', 'active');
    if (needsError)
        throw needsError;
    const needIds = (needs ?? []).map((need) => need.id);
    if (!needIds.length) {
        return { routePlan: null, stops: [], skippedAllocations: [], reason: 'No active disaster needs found.' };
    }
    const { data: allocations, error: allocationsError } = await supabase
        .from('donation_allocations')
        .select('id, need_id, allocated_quantity, status, delivery_method, scheduled_at')
        .in('need_id', needIds)
        .eq('delivery_method', 'platform_delivery')
        .in('status', ['pending', 'accepted'])
        .is('scheduled_at', null);
    if (allocationsError)
        throw allocationsError;
    if (!allocations?.length) {
        return { routePlan: null, stops: [], skippedAllocations: [], reason: 'No pending platform deliveries need route planning.' };
    }
    const needMap = new Map((needs ?? []).map((need) => [
        need.id,
        {
            title: need.title,
            category: need.category,
            organizationId: need.organization_id,
            organizationName: typeof need.organizations === 'object' && need.organizations && 'name' in need.organizations
                ? String(need.organizations.name ?? 'Organization')
                : 'Organization',
            organizationAddress: typeof need.organizations === 'object' && need.organizations && 'address' in need.organizations
                ? need.organizations.address
                : null,
            organizationLatitude: typeof need.organizations === 'object' && need.organizations && 'latitude' in need.organizations
                ? need.organizations.latitude
                : null,
            organizationLongitude: typeof need.organizations === 'object' && need.organizations && 'longitude' in need.organizations
                ? need.organizations.longitude
                : null,
        },
    ]));
    const grouped = new Map();
    const skippedAllocations = [];
    for (const allocation of allocations) {
        const need = needMap.get(allocation.need_id);
        if (!need) {
            skippedAllocations.push({ allocationId: allocation.id, reason: 'Need record not found for allocation.' });
            continue;
        }
        const address = need.organizationAddress ?? '';
        const location = await resolvePointLocation(address, need.organizationLatitude, need.organizationLongitude);
        if (!location) {
            skippedAllocations.push({
                allocationId: allocation.id,
                reason: `Organization "${need.organizationName}" is missing a usable address or coordinates.`,
            });
            continue;
        }
        const key = need.organizationId;
        const existing = grouped.get(key) ?? {
            organizationId: need.organizationId,
            organizationName: need.organizationName,
            address,
            location,
            allocations: [],
        };
        existing.allocations.push({
            allocationId: allocation.id,
            needId: allocation.need_id,
            title: need.title,
            category: need.category,
            quantity: allocation.allocated_quantity ?? 0,
        });
        grouped.set(key, existing);
    }
    const destinations = Array.from(grouped.values());
    if (!destinations.length) {
        return { routePlan: null, stops: [], skippedAllocations, reason: 'No destinations had usable location data.' };
    }
    const plannedStops = await Promise.all(destinations.map(async (destination) => {
        const estimate = await getTravelEstimate(collectionPointLocation, destination.location);
        return {
            destination,
            estimate,
            totalQuantity: destination.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0),
        };
    }));
    plannedStops.sort((a, b) => {
        const aDuration = a.estimate?.durationSeconds ?? Number.MAX_SAFE_INTEGER;
        const bDuration = b.estimate?.durationSeconds ?? Number.MAX_SAFE_INTEGER;
        return aDuration - bDuration;
    });
    const { data: routePlan, error: routePlanError } = await supabase
        .from('route_plans')
        .insert({
        disaster_event_id: options.disasterEventId,
        status: 'planned',
        summary: `Dispatch from ${collectionPoint.name} to ${plannedStops.length} organization stop(s).`,
        objective_score: plannedStops.length,
        metadata: {
            collectionPointId: collectionPoint.id,
            collectionPointName: collectionPoint.name,
            planningMethod: 'google-distance-matrix-nearest-sort',
            skippedAllocations,
        },
    })
        .select('*')
        .single();
    if (routePlanError)
        throw routePlanError;
    const createdStops = [];
    for (const [index, stop] of plannedStops.entries()) {
        const expectedItems = stop.destination.allocations.map((allocation) => ({
            allocationId: allocation.allocationId,
            needId: allocation.needId,
            title: allocation.title,
            category: allocation.category,
            quantity: allocation.quantity,
        }));
        const { data: routeStop, error: routeStopError } = await supabase
            .from('route_stops')
            .insert({
            route_plan_id: routePlan.id,
            stop_order: index + 1,
            stop_type: 'delivery',
            organization_id: stop.destination.organizationId,
            address: stop.destination.address,
            latitude: stop.destination.location.lat,
            longitude: stop.destination.location.lng,
            expected_items: expectedItems,
            expected_quantity: stop.totalQuantity,
            eta_at: stop.estimate
                ? new Date(Date.now() + stop.estimate.durationSeconds * 1000).toISOString()
                : null,
            metadata: {
                distanceMeters: stop.estimate?.distanceMeters ?? null,
                durationSeconds: stop.estimate?.durationSeconds ?? null,
                organizationName: stop.destination.organizationName,
            },
        })
            .select('*')
            .single();
        if (routeStopError)
            throw routeStopError;
        createdStops.push(routeStop);
        await supabase.from('route_allocations').insert(stop.destination.allocations.map((allocation) => ({
            route_plan_id: routePlan.id,
            route_stop_id: routeStop.id,
            allocation_id: allocation.allocationId,
        })));
        const routeSummary = stop.estimate
            ? `Stop ${index + 1}: ${stop.destination.organizationName} (~${Math.round(stop.estimate.durationSeconds / 60)} min, ${(stop.estimate.distanceMeters / 1000).toFixed(1)} km from ${collectionPoint.name}).`
            : `Stop ${index + 1}: ${stop.destination.organizationName} (distance estimate unavailable).`;
        await supabase
            .from('donation_allocations')
            .update({
            scheduled_at: new Date().toISOString(),
            route_summary: routeSummary,
            routing_notes: {
                routePlanId: routePlan.id,
                routeStopId: routeStop.id,
                collectionPointId: collectionPoint.id,
                distanceMeters: stop.estimate?.distanceMeters ?? null,
                durationSeconds: stop.estimate?.durationSeconds ?? null,
            },
        })
            .in('id', stop.destination.allocations.map((allocation) => allocation.allocationId));
    }
    return {
        routePlan,
        collectionPoint,
        stops: createdStops,
        skippedAllocations,
    };
}
