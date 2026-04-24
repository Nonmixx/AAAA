import { getSupabaseBrowserClient } from './client';
import { createNotificationIfPreferred, type NotificationType } from './notifications';

/**
 * Map donation allocation status changes to notification types
 */
export function getNotificationTypeForAllocationStatusChange(
  fromStatus: string,
  toStatus: string
): NotificationType | null {
  // Allocation completed (moved to 'allocated' or 'accepted')
  if (toStatus === 'accepted' || toStatus === 'scheduled') {
    return 'allocationCompleted';
  }
  // Delivery scheduled
  if (toStatus === 'scheduled') {
    return 'deliveryScheduled';
  }
  // Item delivered
  if (toStatus === 'delivered' || toStatus === 'confirmed') {
    return 'itemDelivered';
  }
  return null;
}

/**
 * Create notification for donor when allocation status changes
 * Call this in your allocation update handlers
 */
export async function notifyDonorOfAllocationChange(
  donationId: string,
  allocationId: string,
  fromStatus: string,
  toStatus: string,
  receiverOrgName: string,
  itemName: string
) {
  const supabase = getSupabaseBrowserClient();

  // Fetch donor profile ID
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .select('donor_profile_id')
    .eq('id', donationId)
    .single();

  if (donationError || !donation) {
    console.warn('Could not find donation for notification:', donationId);
    return;
  }

  const notificationType = getNotificationTypeForAllocationStatusChange(fromStatus, toStatus);
  if (!notificationType) {
    return; // No notification for this status transition
  }

  let title = '';
  let body = '';

  switch (notificationType) {
    case 'allocationCompleted':
      title = 'Donation Allocated! 🎉';
      body = `Your donation of ${itemName} has been allocated to ${receiverOrgName}. They will confirm the delivery timeline shortly.`;
      break;
    case 'deliveryScheduled':
      title = 'Delivery Scheduled ✓';
      body = `Your donation to ${receiverOrgName} is scheduled for delivery. Track the progress in your donation history.`;
      break;
    case 'itemDelivered':
      title = 'Delivery Completed! 📦';
      body = `Your donation of ${itemName} has been delivered and confirmed by ${receiverOrgName}. Thank you for making a difference!`;
      break;
    case 'emergencyAlerts':
      title = 'Emergency Alert';
      body = 'An emergency need matching your donation has been flagged.';
      break;
  }

  try {
    await createNotificationIfPreferred(
      donation.donor_profile_id,
      notificationType,
      title,
      body,
      'allocation',
      allocationId
    );
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

/**
 * Notify receiver of incoming donation
 */
export async function notifyReceiverOfIncomingDonation(
  receiverOrgId: string,
  donorName: string,
  itemName: string,
  quantity: number,
  allocationId: string
) {
  const supabase = getSupabaseBrowserClient();

  // Get all members of the receiver organization
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('profile_id')
    .eq('organization_id', receiverOrgId);

  if (membersError || !members) {
    console.warn('Could not fetch organization members:', receiverOrgId);
    return;
  }

  // Create notification for each member
  for (const member of members) {
    try {
      await createNotificationIfPreferred(
        member.profile_id,
        'allocationCompleted',
        'New Donation Incoming 📦',
        `${donorName} has allocated ${quantity} units of ${itemName} to your organization. Review details in Incoming Donations.`,
        'allocation',
        allocationId
      );
    } catch (error) {
      console.error('Failed to create receiver notification for member:', member.profile_id, error);
    }
  }
}
