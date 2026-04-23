import { getSupabaseBrowserClient } from './client';
import { getCurrentReceiverContext } from './receiver';

type AppRole = 'donor' | 'receiver' | 'admin';

export async function ensureSessionAfterSignUp(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (session?.user) return session.user;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

export async function ensureProfile(options?: {
  role?: AppRole;
  fullName?: string;
  phone?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!existingProfile) {
    const metadataRole = user.user_metadata?.role as AppRole | undefined;
    const role = options?.role ?? metadataRole ?? 'donor';
    const fullName = options?.fullName ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User';

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: fullName,
      phone: options?.phone ?? null,
      role,
    });

    if (insertError) throw insertError;

    return { id: user.id, role, created: true };
  }

  return { id: user.id, role: existingProfile.role as AppRole, created: false };
}

export async function resolveAuthenticatedRoute(preferredRole?: AppRole) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) {
    return null;
  }

  const profile = await ensureProfile({ role: preferredRole });
  const role = profile?.role ?? preferredRole ?? 'donor';

  if (role === 'receiver' || role === 'admin') {
    try {
      await getCurrentReceiverContext();
      return '/receiver';
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('No organization found')) {
        return '/receiver-verification';
      }

      throw error;
    }
  }

  return '/donor/dashboard';
}
