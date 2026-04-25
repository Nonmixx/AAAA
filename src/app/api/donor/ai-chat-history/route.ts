import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const GREETING =
  "Hi there! 👋 I’m your AI Donation Assistant for **item donations**. Tell me what item(s) you want to donate, then upload a clear photo so I can check condition and match the best NGOs.";

async function requireDonorUser() {
  const authClient = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();
  if (userError) throw userError;
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile, error: profileError } = await authClient
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || (profile.role !== 'donor' && profile.role !== 'admin')) {
    return { error: NextResponse.json({ error: 'Only donor accounts can access AI chat history.' }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  try {
    const auth = await requireDonorUser();
    if ('error' in auth) return auth.error;

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('donor_ai_chat_sessions')
      .select('id, title, current_stage, detected_item, created_at, updated_at')
      .eq('donor_profile_id', auth.user.id)
      .order('updated_at', { ascending: false })
      .limit(40);

    if (error) throw error;
    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load AI chat history.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireDonorUser();
    if ('error' in auth) return auth.error;

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      currentStage?: string;
      detectedItem?: string;
      withGreeting?: boolean;
    };

    const title = body.title?.trim() || 'New Chat';
    const currentStage = body.currentStage?.trim() || 'greeting';
    const detectedItem = body.detectedItem?.trim() || 'Clothing / Mixed Items';
    const withGreeting = body.withGreeting !== false;

    const supabase = getSupabaseAdminClient();
    const { data: session, error: sessionError } = await supabase
      .from('donor_ai_chat_sessions')
      .insert({
        donor_profile_id: auth.user.id,
        title,
        current_stage: currentStage,
        detected_item: detectedItem,
      })
      .select('id, title, current_stage, detected_item, created_at, updated_at')
      .single();
    if (sessionError) throw sessionError;

    if (withGreeting) {
      const { error: greetingError } = await supabase.from('donor_ai_chat_messages').insert({
        session_id: session.id,
        role: 'bot',
        type: 'text',
        text: GREETING,
        payload: {},
      });
      if (greetingError) throw greetingError;
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create AI chat.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
