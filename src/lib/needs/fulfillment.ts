type NeedLike = {
  id: string;
  quantity_requested: number | null;
  quantity_fulfilled?: number | null;
  status?: string | null;
};

type AllocationLike = {
  need_id: string;
  allocated_quantity: number | null;
};

export const FULFILLMENT_STATUSES = [
  'accepted',
  'scheduled',
  'in_transit',
  'delivered',
  'proof_uploaded',
  'confirmed',
] as const;

export function computeFulfilledQuantity(
  requestedQuantity: number | null | undefined,
  allocations: Array<{ allocated_quantity: number | null | undefined }>,
) {
  const requested = Math.max(0, Number(requestedQuantity ?? 0));
  const total = allocations.reduce((sum, allocation) => sum + Math.max(0, Number(allocation.allocated_quantity ?? 0)), 0);
  return Math.min(requested, total);
}

export function mergeFulfillmentIntoNeeds<T extends NeedLike>(
  needs: T[],
  allocations: AllocationLike[],
) {
  const allocationsByNeed = new Map<string, AllocationLike[]>();

  for (const allocation of allocations) {
    const bucket = allocationsByNeed.get(allocation.need_id) ?? [];
    bucket.push(allocation);
    allocationsByNeed.set(allocation.need_id, bucket);
  }

  return needs.map((need) => {
    const recomputedFulfilled = computeFulfilledQuantity(
      need.quantity_requested,
      allocationsByNeed.get(need.id) ?? [],
    );

    const nextStatus =
      recomputedFulfilled >= Math.max(0, Number(need.quantity_requested ?? 0)) &&
      Math.max(0, Number(need.quantity_requested ?? 0)) > 0
        ? 'fulfilled'
        : need.status === 'fulfilled'
          ? 'active'
          : need.status ?? 'active';

    return {
      ...need,
      quantity_fulfilled: recomputedFulfilled,
      status: nextStatus,
    };
  });
}
