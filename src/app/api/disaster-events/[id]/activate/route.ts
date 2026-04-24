import { NextResponse } from 'next/server';
import { activateDisasterEvent, requireAdmin } from '@/lib/disaster/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseServerClient();
    const profile = await requireAdmin(supabase);
    const event = await activateDisasterEvent(supabase, id, profile.id, 'manual');
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to activate disaster event.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
