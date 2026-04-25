import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _responseHeaders) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions);
          });
        } catch {
          // Next.js: cookies can only be set in a Route Handler or Server Action.
          // Server Components may still read the session; refresh in middleware if needed.
        }
      },
    },
  });
}

/** Same as {@link getSupabaseServerClient} but returns null when env is missing (e.g. demo-only dev). */
export async function getSupabaseServerClientOrNull() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return getSupabaseServerClient();
}
