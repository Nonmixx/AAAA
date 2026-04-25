import { getSupabaseBrowserClient } from './client';

export type NotificationType = 
  | 'allocationCompleted' 
  | 'deliveryScheduled' 
  | 'itemDelivered' 
  | 'emergencyAlerts';

export interface NotificationRow {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * Create a notification only if the user has it enabled in preferences
 */
export async function createNotificationIfPreferred(
  profileId: string,
  notificationType: NotificationType,
  title: string,
  body: string,
  entityType?: string,
  entityId?: string
) {
  const supabase = getSupabaseBrowserClient();
  
  // Fetch user preferences
  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select(mapNotificationTypeToColumn(notificationType))
    .eq('profile_id', profileId)
    .single();

  if (prefsError) throw prefsError;

  // Check if user has this notification type enabled
  const prefColumn = mapNotificationTypeToColumn(notificationType);
  const isEnabled = prefs?.[prefColumn as keyof typeof prefs];
  
  if (!isEnabled) {
    return null; // User has this notification disabled
  }

  // Insert into notifications table
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      profile_id: profileId,
      type: notificationType,
      title,
      body,
      entity_type: entityType,
      entity_id: entityId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationRow;
}

/**
 * Map notification type to database column name
 */
function mapNotificationTypeToColumn(type: NotificationType): string {
  const mapping: Record<NotificationType, string> = {
    allocationCompleted: 'allocation_completed',
    deliveryScheduled: 'delivery_scheduled',
    itemDelivered: 'item_delivered',
    emergencyAlerts: 'emergency_mode_alerts',
  };
  return mapping[type];
}

/**
 * Fetch notifications for current user
 */
export async function fetchDonorNotifications(limit = 20) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as NotificationRow[];
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadNotificationCount() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

/**
 * Mark single notification as read
 */
export async function markNotificationRead(notificationId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsRead() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('profile_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}
