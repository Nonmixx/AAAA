import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type InsertMessageBody = {
  sessionId?: string;
  role?: 'user' | 'bot';
  type?: 'text' | 'image' | 'analysis';
  text?: string | null;
  payload?: Record<string, unknown>;
  currentStage?: string;
  detectedItem?: string;
};

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

async function requireOwnedSession(sessionId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: session, error } = await supabase
    .from('donor_ai_chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('donor_profile_id', userId)
    .maybeSingle();
  if (error) throw error;
  return session;
}

export async function GET(req: Request) {
  try {
    const auth = await requireDonorUser();
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });

    const session = await requireOwnedSession(sessionId, auth.user.id);
    if (!session) return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });

    const supabase = getSupabaseAdminClient();
    const { data: messages, error } = await supabase
      .from('donor_ai_chat_messages')
      .select('id, role, type, text, payload, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ messages: messages ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load chat messages.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireDonorUser();
    if ('error' in auth) return auth.error;

    const body = (await req.json()) as InsertMessageBody;
    const sessionId = body.sessionId?.trim();
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
    if (body.role !== 'user' && body.role !== 'bot') {
      return NextResponse.json({ error: 'role must be user or bot.' }, { status: 400 });
    }
    if (body.type !== 'text' && body.type !== 'image' && body.type !== 'analysis') {
      return NextResponse.json({ error: 'type must be text, image, or analysis.' }, { status: 400 });
    }

    const session = await requireOwnedSession(sessionId, auth.user.id);
    if (!session) return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });

    const supabase = getSupabaseAdminClient();
    const { data: inserted, error: insertError } = await supabase
      .from('donor_ai_chat_messages')
      .insert({
        session_id: sessionId,
        role: body.role,
        type: body.type,
        text: body.text ?? null,
        payload: body.payload ?? {},
      })
      .select('id, role, type, text, payload, created_at')
      .single();
    if (insertError) throw insertError;

    const updates: Record<string, string> = {};
    if (body.currentStage?.trim()) updates.current_stage = body.currentStage.trim();
    if (body.detectedItem?.trim()) updates.detected_item = body.detectedItem.trim();

    if (body.role === 'user' && body.text?.trim()) {
      const title = body.text.trim().slice(0, 38);
      updates.title = title || 'New Chat';
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase.from('donor_ai_chat_sessions').update(updates).eq('id', sessionId);
    } else {
      await supabase
        .from('donor_ai_chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    return NextResponse.json({ message: inserted }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save chat message.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
