import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/disaster/server';
import { previewExternalSignals, runDisasterDetectionJob } from '@/lib/disaster/jobs';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    await requireAdmin(supabase);
    const url = new URL(req.url);
    if (url.searchParams.get('dryRun') === '1') {
      const preview = await previewExternalSignals();
      return NextResponse.json({ dryRun: true, preview });
    }
    const result = await runDisasterDetectionJob(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to run disaster ingestion job.' },
      { status: 500 },
    );
  }
}
