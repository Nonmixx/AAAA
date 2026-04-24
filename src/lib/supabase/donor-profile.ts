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

// --- Notification preferences & emergency UI (stored on auth user_metadata; survives logout/login) ---

const META_NOTIF_KEY = 'donor_notification_prefs';
const META_EMERGENCY_UI_KEY = 'donor_emergency_mode_ui';

export const DONOR_NOTIFICATION_KEYS = [
  'allocationCompleted',
  'deliveryScheduled',
  'itemDelivered',
  'proofOfDelivery',
  'emergencyAlerts',
] as const;

export type DonorNotificationPrefs = Record<(typeof DONOR_NOTIFICATION_KEYS)[number], boolean>;

function defaultNotificationPrefs(): DonorNotificationPrefs {
  return {
    allocationCompleted: true,
    deliveryScheduled: true,
    itemDelivered: true,
    proofOfDelivery: true,
    emergencyAlerts: true,
  };
}

export function parseDonorNotificationPrefs(raw: unknown): DonorNotificationPrefs {
  const d = defaultNotificationPrefs();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const o = raw as Record<string, unknown>;
  for (const k of DONOR_NOTIFICATION_KEYS) {
    if (typeof o[k] === 'boolean') (d as Record<string, boolean>)[k] = o[k] as boolean;
  }
  return d;
}

export async function fetchDonorNotificationPrefsAsBooleans(): Promise<boolean[]> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DONOR_NOTIFICATION_KEYS.map(() => true);
  const p = parseDonorNotificationPrefs(user.user_metadata?.[META_NOTIF_KEY]);
  return DONOR_NOTIFICATION_KEYS.map((k) => p[k]);
}

export async function saveDonorNotificationPrefsFromBooleans(states: boolean[]) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not signed in');

  const prefs = defaultNotificationPrefs();
  DONOR_NOTIFICATION_KEYS.forEach((k, i) => {
    prefs[k] = !!states[i];
  });

  const { error } = await supabase.auth.updateUser({
    data: { [META_NOTIF_KEY]: prefs },
  });
  if (error) throw error;
}

export async function fetchDonorEmergencyModeUi(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return user.user_metadata?.[META_EMERGENCY_UI_KEY] === true;
}

export async function saveDonorEmergencyModeUi(value: boolean) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({
    data: { [META_EMERGENCY_UI_KEY]: value },
  });
  if (error) throw error;
}
