export const DISASTER_KEYWORDS = [
  'banjir',
  'flood',
  'evacuate',
  'evacuation',
  'pps',
  'nadma',
  'landslide',
  'shelter',
  'relief center',
  'mangsa',
] as const;

export type DisasterEventStatus =
  | 'detected'
  | 'review_pending'
  | 'active'
  | 'stabilizing'
  | 'closed'
  | 'suppressed';

export type PlatformMode = 'normal' | 'crisis';
export type IncidentSourceType = 'news' | 'nadma' | 'social' | 'manual' | 'webhook';
export type IncidentReviewStatus = 'pending' | 'accepted' | 'suppressed' | 'duplicate';

export type SignalInput = {
  sourceType: IncidentSourceType;
  sourceName: string;
  normalizedText: string;
  rawPayload?: Record<string, unknown>;
  detectedLocations?: string[];
  detectedKeywords?: string[];
  sourceRef?: string | null;
};

export type DisasterEventRecord = {
  id: string;
  title: string;
  disaster_type: string;
  status: DisasterEventStatus;
  severity: string;
  affected_regions: string[];
  source: string | null;
  activation_mode: 'manual' | 'auto' | 'escalated_auto';
  auto_confidence: number | null;
  summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  activated_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type IncidentSignalRecord = {
  id: string;
  source_type: IncidentSourceType;
  source_name: string;
  normalized_text: string;
  detected_locations: string[];
  detected_keywords: string[];
  confidence_score: number;
  review_status: IncidentReviewStatus;
  linked_disaster_event_id: string | null;
  escalation_deadline_at: string | null;
  created_at: string;
};

export type PlatformStatusRecord = {
  status_key: string;
  mode: PlatformMode;
  active_disaster_event_id: string | null;
  activated_at: string | null;
  automation_lock: boolean;
  metadata: Record<string, unknown>;
};
