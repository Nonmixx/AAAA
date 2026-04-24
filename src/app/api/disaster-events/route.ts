import { NextResponse } from 'next/server';
import { createDisasterEvent, requireAdmin } from '@/lib/disaster/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    await requireAdmin(supabase);

    const { data, error } = await supabase
      .from('disaster_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load disaster events.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    await requireAdmin(supabase);
    const body = (await req.json()) as {
      title?: string;
      disasterType?: string;
      severity?: string;
      affectedRegions?: string[];
      source?: string | null;
      summary?: string | null;
    };

    if (!body.title?.trim() || !body.disasterType?.trim()) {
      return NextResponse.json({ error: 'title and disasterType are required.' }, { status: 400 });
    }

    const event = await createDisasterEvent(supabase, {
      title: body.title.trim(),
      disasterType: body.disasterType.trim(),
      severity: body.severity?.trim() || 'medium',
      affectedRegions: Array.isArray(body.affectedRegions)
        ? body.affectedRegions.map((item) => item.trim()).filter(Boolean)
        : [],
      source: body.source?.trim() || 'manual',
      summary: body.summary?.trim() || null,
      activationMode: 'manual',
      status: 'review_pending',
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create disaster event.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
