import type { SupabaseClient } from '@supabase/supabase-js';
import { eventTitleForSignal, scoreSignal, summarizeSignal } from './scoring';
import type {
  DisasterEventRecord,
  IncidentSignalRecord,
  PlatformStatusRecord,
  SignalInput,
} from './types';

type Json = Record<string, unknown>;

type AdminProfile = { id: string };

export async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error('Unauthorized');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden');
  }

  return profile;
}

async function getAdminProfiles(supabase: SupabaseClient): Promise<AdminProfile[]> {
  const { data, error } = await supabase.from('profiles').select('id').eq('role', 'admin');
  if (error) throw error;
  return (data ?? []) as AdminProfile[];
}

export async function pushAdminNotification(
  supabase: SupabaseClient,
  input: {
    title: string;
    body: string;
    disasterEventId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    type?: string;
  },
) {
  const admins = await getAdminProfiles(supabase);
  if (!admins.length) return;

  const rows = admins.map((admin) => ({
    profile_id: admin.id,
    type: input.type ?? 'disaster_alert',
    title: input.title,
    body: input.body,
    entity_type: input.entityType ?? 'disaster_event',
    entity_id: input.entityId ?? input.disasterEventId ?? null,
    disaster_event_id: input.disasterEventId ?? null,
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
}

export async function getPlatformStatus(supabase: SupabaseClient): Promise<PlatformStatusRecord | null> {
  const { data, error } = await supabase.from('platform_status').select('*').eq('status_key', 'primary').maybeSingle();
  if (error) throw error;
  return (data as PlatformStatusRecord | null) ?? null;
}

export async function createIncidentSignal(supabase: SupabaseClient, input: SignalInput) {
  const scored = scoreSignal(input);
  const summary = summarizeSignal(input.normalizedText, input.sourceName, scored.detectedLocations);

  const payload = {
    source_type: input.sourceType,
    source_name: input.sourceName,
    source_ref: input.sourceRef ?? null,
    raw_payload: input.rawPayload ?? {},
    normalized_text: input.normalizedText.trim(),
    detected_locations: scored.detectedLocations,
    detected_keywords: scored.detectedKeywords,
    confidence_score: scored.confidenceScore,
    review_status: 'pending',
    escalation_deadline_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    metadata: { summary },
  };

  const { data, error } = await supabase.from('incident_signals').insert(payload).select('*').single();
  if (error) throw error;
  return data as IncidentSignalRecord & { metadata?: Json };
}

export async function createDisasterEvent(
  supabase: SupabaseClient,
  input: {
    title: string;
    disasterType: string;
    severity: string;
    affectedRegions: string[];
    source?: string | null;
    activationMode?: 'manual' | 'auto' | 'escalated_auto';
    autoConfidence?: number | null;
    summary?: string | null;
    status?: DisasterEventRecord['status'];
    metadata?: Json;
  },
) {
  const payload = {
    title: input.title,
    disaster_type: input.disasterType,
    severity: input.severity,
    affected_regions: input.affectedRegions,
    source: input.source ?? null,
    activation_mode: input.activationMode ?? 'manual',
    auto_confidence: input.autoConfidence ?? null,
    summary: input.summary ?? null,
    status: input.status ?? 'review_pending',
    started_at: new Date().toISOString(),
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase.from('disaster_events').insert(payload).select('*').single();
  if (error) throw error;

  await pushAdminNotification(supabase, {
    title: 'Disaster Event Created',
    body: `${payload.disaster_type} event "${payload.title}" is ready for review.`,
    disasterEventId: (data as DisasterEventRecord).id,
  });

  return data as DisasterEventRecord;
}

export async function activateDisasterEvent(
  supabase: SupabaseClient,
  disasterEventId: string,
  profileId: string | null,
  activationMode: 'manual' | 'auto' | 'escalated_auto' = 'manual',
) {
  const now = new Date().toISOString();
  const { data: event, error: eventError } = await supabase
    .from('disaster_events')
    .update({
      status: 'active',
      activation_mode: activationMode,
      activated_at: now,
      activated_by: profileId,
      updated_at: now,
      started_at: now,
    })
    .eq('id', disasterEventId)
    .select('*')
    .single();

  if (eventError) throw eventError;

  const { data: updatedPlatformRow, error: platformError } = await supabase
    .from('platform_status')
    .update({
      mode: 'crisis',
      active_disaster_event_id: disasterEventId,
      activated_at: now,
      activated_by: profileId,
      updated_at: now,
    })
    .eq('status_key', 'primary')
    .select('status_key')
    .maybeSingle();

  if (platformError) throw platformError;
  if (!updatedPlatformRow) {
    throw new Error('platform_status row with status_key="primary" is missing.');
  }

  await pushAdminNotification(supabase, {
    title: 'Crisis Mode Activated',
    body: `${event.title} is now active and the platform is in crisis mode.`,
    disasterEventId,
  });

  return event as DisasterEventRecord;
}

export async function runDetectionSweep(supabase: SupabaseClient) {
  const now = new Date();
  const { data, error } = await supabase
    .from('incident_signals')
    .select('*')
    .eq('review_status', 'pending')
    .is('linked_disaster_event_id', null)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;

  const createdEvents: DisasterEventRecord[] = [];
  const escalatedEvents: DisasterEventRecord[] = [];
  const skippedSignals: Array<{
    signalId: string;
    confidenceScore: number;
    reason: string;
    sourceName: string;
    normalizedText: string;
  }> = [];

  for (const signal of (data ?? []) as (IncidentSignalRecord & { metadata?: Json })[]) {
    if (signal.confidence_score >= 0.58) {
      const event = await createDisasterEvent(supabase, {
        title: eventTitleForSignal(signal.detected_locations, signal.detected_keywords),
        disasterType:
          signal.detected_keywords.find((keyword) => ['banjir', 'flood', 'landslide'].includes(keyword)) ?? 'disaster',
        severity: signal.confidence_score >= 0.78 ? 'high' : 'medium',
        affectedRegions: signal.detected_locations,
        source: signal.source_name,
        activationMode: 'auto',
        autoConfidence: signal.confidence_score,
        summary: typeof signal.metadata?.summary === 'string' ? signal.metadata.summary : signal.normalized_text,
        status: 'review_pending',
        metadata: { signalId: signal.id },
      });

      const { error: linkError } = await supabase
        .from('incident_signals')
        .update({
          linked_disaster_event_id: event.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', signal.id);

      if (linkError) throw linkError;
      createdEvents.push(event);
    } else {
      skippedSignals.push({
        signalId: signal.id,
        confidenceScore: signal.confidence_score,
        reason: 'Confidence below auto-create threshold of 0.58.',
        sourceName: signal.source_name,
        normalizedText: signal.normalized_text,
      });
    }
  }

  const { data: reviewPending, error: reviewPendingError } = await supabase
    .from('disaster_events')
    .select('*')
    .eq('status', 'review_pending')
    .order('created_at', { ascending: true });

  if (reviewPendingError) throw reviewPendingError;

  for (const event of (reviewPending ?? []) as DisasterEventRecord[]) {
    const signalId = typeof event.metadata?.signalId === 'string' ? event.metadata.signalId : null;
    if (!signalId) continue;

    const { data: signal, error: signalError } = await supabase
      .from('incident_signals')
      .select('*')
      .eq('id', signalId)
      .maybeSingle();

    if (signalError) throw signalError;
    if (!signal?.escalation_deadline_at) continue;

    if (new Date(signal.escalation_deadline_at) <= now) {
      const activated = await activateDisasterEvent(supabase, event.id, null, 'escalated_auto');
      escalatedEvents.push(activated);
    }
  }

  return {
    createdEvents,
    escalatedEvents,
    skippedSignals,
    thresholds: {
      createEventAt: 0.58,
      highSeverityAt: 0.78,
    },
  };
}
