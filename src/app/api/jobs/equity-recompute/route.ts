import { NextResponse } from 'next/server';
import { getActiveDisasterEventId, recomputeEquityMetrics } from '@/lib/disaster/jobs';
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

    await recomputeEquityMetrics(supabase, disasterEventId);
    return NextResponse.json({ ok: true, disasterEventId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to recompute equity metrics.' },
      { status: 500 },
    );
  }
}
