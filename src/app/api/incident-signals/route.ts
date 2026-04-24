import { NextResponse } from 'next/server';
import { createIncidentSignal, requireAdmin } from '@/lib/disaster/server';
import type { SignalInput } from '@/lib/disaster/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    await requireAdmin(supabase);

    const { data, error } = await supabase
      .from('incident_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ signals: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load incident signals.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    await requireAdmin(supabase);
    const body = (await req.json()) as SignalInput;

    if (!body.sourceType || !body.sourceName?.trim() || !body.normalizedText?.trim()) {
      return NextResponse.json(
        { error: 'sourceType, sourceName, and normalizedText are required.' },
        { status: 400 },
      );
    }

    const signal = await createIncidentSignal(supabase, {
      ...body,
      sourceName: body.sourceName.trim(),
      normalizedText: body.normalizedText.trim(),
    });

    return NextResponse.json({ signal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create incident signal.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
