import { NextResponse } from 'next/server';
import { createRoutePlan, getActiveDisasterEventId } from '@/lib/disaster/jobs';
import { requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const authClient = await getSupabaseServerClient();
    await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const body = (await req.json().catch(() => ({}))) as {
      disasterEventId?: string;
      collectionPointId?: string;
    };

    const disasterEventId = body.disasterEventId ?? (await getActiveDisasterEventId(supabase));
    if (!disasterEventId) {
      return NextResponse.json({ error: 'No active disaster event found.' }, { status: 400 });
    }

    const result = await createRoutePlan(supabase, {
      disasterEventId,
      collectionPointId: body.collectionPointId ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to build route plan.' },
      { status: 500 },
    );
  }
}
