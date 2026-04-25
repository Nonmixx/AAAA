/**
 * Structured donation workflow — returned by `/api/donation-assistant/chat`
 * and rendered in AIDonation for agentic UX (intent → structure → recommend → orchestrate).
 */

export type DonationWorkflowPhase =
  | 'intent_understanding'
  | 'structured_intake'
  | 'logistics_decision'
  | 'matching'
  | 'awaiting_confirmation'
  | 'awaiting_photo'
  | 'complete';

/** Aligned with intake policy: self drop-off vs two platform-funded pickup rails (donor never pays courier). */
export type DeliveryOptionId =
  | 'self_dropoff'
  | 'pickup_corporate_wallet'
  | 'pickup_community_board';

export interface DonationDeliveryOption {
  id: DeliveryOptionId;
  label: string;
  description: string;
  recommended?: boolean;
}

export interface DonationImpactEstimate {
  headline: string;
  beneficiaryLow: number;
  beneficiaryHigh: number;
  basisNote: string;
}

export interface DonationLogisticsAssessment {
  donor_can_self_deliver: boolean;
  ai_pickup_requestable: boolean;
  ngo_dropoff_near_catalog: boolean;
  sponsored_delivery_available: boolean;
  summary: string;
}

export interface DonationStructuredObject {
  donation_type: string;
  urgency: 'high' | 'medium' | 'low' | 'normal';
  status: 'incomplete' | 'ready_for_screening' | 'allocated';
  missing_fields: string[];
  quantity_note?: string | null;
  location_note?: string | null;
  preferred_delivery?: DeliveryOptionId | null;
}

export interface DonationWorkflowNgoSummary {
  name: string;
  ngoId: string;
  location: string;
  urgency: string;
  routing_percent: number;
}

export interface DonationWorkflowSnapshot {
  version: 1;
  flow_id: string;
  phase: DonationWorkflowPhase;
  workflow_state_label: string;
  next_step_user: string;
  intent: 'donate_physical_item' | 'unclear' | 'unsupported';
  category_display: string;
  category_slug: string;
  action_type: 'donation_initiation' | 'follow_up' | 'clarification';
  structured_donation: DonationStructuredObject;
  logistics: DonationLogisticsAssessment;
  impact: DonationImpactEstimate;
  matched_ngo_summaries: DonationWorkflowNgoSummary[];
  delivery_options: DonationDeliveryOption[];
  questions_to_resolve: string[];
  engine: 'donation-workflow-engine@v1';
}
