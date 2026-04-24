export type NeedUrgency = 'low' | 'medium' | 'high';

type NeedPriorityInput = {
  isEmergency?: boolean | null;
  urgency?: NeedUrgency | null;
  quantityRequested?: number | null;
  quantityFulfilled?: number | null;
};

export function getUrgencyRank(urgency?: NeedUrgency | null): number {
  if (urgency === 'high') return 3;
  if (urgency === 'medium') return 2;
  return 1;
}

export function getRemainingQuantity(quantityRequested?: number | null, quantityFulfilled?: number | null): number {
  return Math.max(0, (quantityRequested ?? 0) - (quantityFulfilled ?? 0));
}

export function compareNeedPriority(a: NeedPriorityInput, b: NeedPriorityInput): number {
  const emergencyDiff = Number(Boolean(b.isEmergency)) - Number(Boolean(a.isEmergency));
  if (emergencyDiff !== 0) return emergencyDiff;

  const urgencyDiff = getUrgencyRank(b.urgency) - getUrgencyRank(a.urgency);
  if (urgencyDiff !== 0) return urgencyDiff;

  const remainingDiff =
    getRemainingQuantity(b.quantityRequested, b.quantityFulfilled) -
    getRemainingQuantity(a.quantityRequested, a.quantityFulfilled);
  if (remainingDiff !== 0) return remainingDiff;

  return 0;
}
