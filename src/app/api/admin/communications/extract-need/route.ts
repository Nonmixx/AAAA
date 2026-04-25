import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/disaster/server';
import { extractNeedSuggestionFromTranscript } from '@/lib/disaster/needExtraction';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const authClient = await getSupabaseServerClient();
    await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const body = (await req.json().catch(() => ({}))) as { communicationId?: string; transcript?: string };

    let transcript = body.transcript?.trim() ?? '';
    const communicationId = body.communicationId ?? null;

    if (!transcript && communicationId) {
      const { data: communication, error } = await supabase
        .from('communications')
        .select('id, transcript')
        .eq('id', communicationId)
        .maybeSingle();

      if (error) throw error;
      transcript = communication?.transcript?.trim() ?? '';
    }

    if (!transcript) {
      return NextResponse.json({ error: 'communicationId or transcript is required.' }, { status: 400 });
    }

    const suggestion = extractNeedSuggestionFromTranscript(transcript);
    return NextResponse.json({ suggestion, communicationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to extract a need suggestion.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

