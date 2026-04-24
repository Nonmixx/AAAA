import { NextResponse } from 'next/server';
import { getActiveDisasterEventId, previewShelterOutreach, sendShelterOutreach } from '@/lib/disaster/jobs';
import { requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const authClient = await getSupabaseServerClient();
    await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const body = (await req.json().catch(() => ({}))) as { disasterEventId?: string };
    const disasterEventId = body.disasterEventId ?? (await getActiveDisasterEventId(supabase));
    if (!disasterEventId) {
      return NextResponse.json({ error: 'No active disaster event found.' }, { status: 400 });
    }

    if ((body as { dryRun?: boolean }).dryRun) {
      const preview = await previewShelterOutreach(supabase, disasterEventId);
      return NextResponse.json({ dryRun: true, disasterEventId, previewCount: preview.length, preview });
    }

    const sent = await sendShelterOutreach(supabase, disasterEventId);
    return NextResponse.json({ sentCount: sent.length, sent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to run shelter outreach.' },
      { status: 500 },
    );
  }
}
