import { getSupabaseBrowserClient } from './client';

type ReceiverRole = 'receiver' | 'admin';

export type ReceiverOrganization = {
  id: string;
  owner_profile_id: string;
  name?: string;
  registration_number?: string | null;
  contact_email?: string;
  contact_phone?: string | null;
  address?: string | null;
  description?: string | null;
  verification_status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
};

export type ReceiverContext = {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    id: string;
    role: ReceiverRole;
  };
  organization: ReceiverOrganization;
};

export async function getCurrentReceiverContext(): Promise<ReceiverContext> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) {
    throw new Error('Please login as a receiver account first.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || (profile.role !== 'receiver' && profile.role !== 'admin')) {
    throw new Error('Please login as a receiver account first.');
  }

  const { data: ownedOrganization, error: ownedOrgError } = await supabase
    .from('organizations')
    .select('id, owner_profile_id, name, registration_number, contact_email, contact_phone, address, description, verification_status, created_at')
    .eq('owner_profile_id', user.id)
    .maybeSingle();

  if (ownedOrgError) throw ownedOrgError;
  if (ownedOrganization) {
    return {
      user: { id: user.id, email: user.email },
      profile: { id: profile.id, role: profile.role as ReceiverRole },
      organization: ownedOrganization as ReceiverOrganization,
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership?.organization_id) {
    throw new Error('No organization found. Complete receiver verification first.');
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, owner_profile_id, name, registration_number, contact_email, contact_phone, address, description, verification_status, created_at')
    .eq('id', membership.organization_id)
    .maybeSingle();

  if (organizationError) throw organizationError;
  if (!organization) {
    throw new Error('No organization found. Complete receiver verification first.');
  }

  return {
    user: { id: user.id, email: user.email },
    profile: { id: profile.id, role: profile.role as ReceiverRole },
    organization: organization as ReceiverOrganization,
  };
}
