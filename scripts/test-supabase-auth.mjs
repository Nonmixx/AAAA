import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const mode = process.argv[2] ?? 'receiver';
if (!['receiver', 'donor'].includes(mode)) {
  console.error('Usage: node scripts/test-supabase-auth.mjs [receiver|donor]');
  process.exit(1);
}

const email = `codex-${mode}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
const password = `Codex!${randomUUID().replace(/-/g, '').slice(0, 10)}`;
const fullName = `Codex ${mode} Test`;
const organizationName = `Codex Org ${Date.now()}`;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function createAuthedDataClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function ensureSessionAfterSignUp() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user && sessionData.session?.access_token) {
    return sessionData.session;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error('Sign in succeeded but no access token was returned.');
  }
  return data.session;
}

async function ensureProfile(dataClient, user, role) {
  const { data: existingProfile, error: profileLookupError } = await dataClient
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileLookupError) throw profileLookupError;

  if (existingProfile) {
    return existingProfile;
  }

  const { error: insertError } = await dataClient.from('profiles').insert({
    id: user.id,
    full_name: fullName,
    role,
  });

  if (insertError) throw insertError;
  return { id: user.id, role };
}

async function run() {
  console.log(`Testing ${mode} signup/login flow`);
  console.log(`Email: ${email}`);

  const signUpPayload = {
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: mode,
      },
    },
  };

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp(signUpPayload);
  if (signUpError) throw signUpError;

  console.log(`Sign up ok. user=${signUpData.user?.id ?? 'none'} session=${signUpData.session ? 'yes' : 'no'}`);

  const session = await ensureSessionAfterSignUp();
  const signedInUser = session.user;
  const dataClient = createAuthedDataClient(session.access_token);
  console.log(`Active session ok. user=${signedInUser?.id ?? 'none'}`);

  const profile = await ensureProfile(dataClient, signedInUser, mode);
  console.log(`Profile ok. id=${profile.id} role=${profile.role}`);

  if (mode === 'receiver') {
    const { data: existingOrganization, error: orgLookupError } = await dataClient
      .from('organizations')
      .select('id, owner_profile_id, name')
      .eq('owner_profile_id', profile.id)
      .maybeSingle();

    if (orgLookupError) throw orgLookupError;

    if (!existingOrganization) {
      const { data: insertedOrganization, error: orgInsertError } = await dataClient
        .from('organizations')
        .insert({
          owner_profile_id: profile.id,
          name: organizationName,
          registration_number: `REG-${Date.now()}`,
          contact_email: email,
          verification_status: 'pending',
        })
        .select('id, owner_profile_id, name')
        .single();

      if (orgInsertError) throw orgInsertError;
      console.log(`Organization created. id=${insertedOrganization.id} name=${insertedOrganization.name}`);
    } else {
      console.log(`Organization already exists. id=${existingOrganization.id} name=${existingOrganization.name}`);
    }
  }

  await supabase.auth.signOut();
  console.log('Signed out.');

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  console.log(`Login ok. user=${loginData.user?.id ?? 'none'} session=${loginData.session ? 'yes' : 'no'}`);

  const {
    data: { user: finalUser },
    error: finalUserError,
  } = await supabase.auth.getUser();

  if (finalUserError) throw finalUserError;
  if (!finalUser) throw new Error('Login completed but getUser returned no user.');

  console.log('Auth smoke test passed.');
}

run().catch((error) => {
  console.error('Auth smoke test failed.');
  console.error(error);
  process.exit(1);
});
