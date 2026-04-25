import { getSupabaseBrowserClient } from './client';

const ADDRESS_META_KEY = 'donor_address';

export type DonorProfileEditor = {
  fullName: string;
  phone: string;
  address: string;
  email: string;
};

/** Display name for dashboard / headers — prefers `profiles.full_name`, then auth metadata / email. */
export async function fetchDonorDisplayName(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'Donor';

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();

  const fromProfile = profile?.full_name?.trim();
  if (fromProfile) return fromProfile;

  const meta = user.user_metadata?.full_name;
  if (typeof meta === 'string' && meta.trim()) return meta.trim();

  return user.email?.split('@')[0] || 'Donor';
}

export async function fetchDonorProfileEditor(): Promise<DonorProfileEditor | null> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const metaAddr = user.user_metadata?.[ADDRESS_META_KEY];
  const address = typeof metaAddr === 'string' ? metaAddr : '';

  return {
    fullName: (profile?.full_name as string | null)?.trim() || (user.user_metadata?.full_name as string) || '',
    phone: (profile?.phone as string | null) || '',
    address,
    email: user.email || '',
  };
}

/** Persists donor fields: `profiles` row + auth `user_metadata` for address (no DB migration required). */
export async function updateDonorProfile(input: { fullName: string; phone: string; address: string }) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not signed in');

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone.trim() || null,
    })
    .eq('id', user.id);

  if (profileError) throw profileError;

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: input.fullName.trim(),
      [ADDRESS_META_KEY]: input.address.trim(),
    },
  });

  if (authError) throw authError;
}

// --- Notification preferences & emergency UI (stored in user_preferences table) ---

export const DONOR_NOTIFICATION_KEYS = [
  'allocationCompleted',
  'deliveryScheduled',
  'itemDelivered',
  'emergencyAlerts',
] as const;

export type DonorNotificationPrefs = Record<(typeof DONOR_NOTIFICATION_KEYS)[number], boolean>;

export async function fetchDonorNotificationPrefsAsBooleans(): Promise<boolean[]> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DONOR_NOTIFICATION_KEYS.map(() => true);

  const { data: prefs, error } = await supabase
    .from('user_preferences')
    .select('allocation_completed, delivery_scheduled, item_delivered, emergency_mode_alerts')
    .eq('profile_id', user.id)
    .single();

  if (error) throw error;

  return [
    prefs?.allocation_completed ?? true,
    prefs?.delivery_scheduled ?? true,
    prefs?.item_delivered ?? true,
    prefs?.emergency_mode_alerts ?? true,
  ];
}

export async function saveDonorNotificationPrefsFromBooleans(states: boolean[]) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('user_preferences')
    .update({
      allocation_completed: states[0] ?? true,
      delivery_scheduled: states[1] ?? true,
      item_delivered: states[2] ?? true,
      emergency_mode_alerts: states[3] ?? true,
    })
    .eq('profile_id', user.id);

  if (error) throw error;
}

export async function fetchDonorEmergencyModeUi(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: prefs, error } = await supabase
    .from('user_preferences')
    .select('emergency_mode_view')
    .eq('profile_id', user.id)
    .single();

  if (error) throw error;
  return prefs?.emergency_mode_view ?? false;
}

export async function saveDonorEmergencyModeUi(value: boolean) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('user_preferences')
    .update({ emergency_mode_view: value })
    .eq('profile_id', user.id);

  if (error) throw error;
}
