export type PlanUrgency = 'High' | 'Medium' | 'Low';
export type ItemCondition = 'Good' | 'Worn' | 'Damaged' | 'Unknown';
export type DeliveryPreference = 'platform_delivery' | 'self_delivery';

export type ReceiverMatchContext = 'monetary' | 'in_kind';

export interface PlanReceiver {
  ngoId: string;
  name: string;
  location: string;
  allocation: number;
  percent: number;
  urgency: PlanUrgency;
  reason: string[];
  /** When set, UI and copy treat this row as cash routing vs physical-item fit. */
  matchContext?: ReceiverMatchContext;
}

/** Payload returned to the browser (no secrets). */
export interface DonationPlanPayload {
  donorIntent: string;
  ngoDemandCheck: string;
  urgencyEvaluation: string;
  planSummary: string;
  receivers: PlanReceiver[];
  model: string;
  source: 'glm' | 'fallback';
}

export interface PlanRequestBody {
  transcript: string;
  detectedItem: string;
  condition: ItemCondition;
  deliveryPreference?: DeliveryPreference;
}
