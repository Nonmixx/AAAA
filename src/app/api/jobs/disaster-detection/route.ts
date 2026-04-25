import { NextResponse } from 'next/server';
import { requireAdmin, runDetectionSweep } from '@/lib/disaster/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    await requireAdmin(supabase);
    const result = await runDetectionSweep(supabase);
    return NextResponse.json({
      createdEvents: result.createdEvents,
      escalatedEvents: result.escalatedEvents,
      skippedSignals: result.skippedSignals,
      thresholds: result.thresholds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run disaster detection sweep.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
