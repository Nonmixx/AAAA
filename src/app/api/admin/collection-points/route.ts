import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const authClient = await getSupabaseServerClient();
    await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const body = (await req.json()) as {
      disasterEventId?: string;
      name?: string;
      type?: string;
      address?: string;
      capacity?: number | null;
      managerContact?: string | null;
      servingRegions?: string[];
    };

    const { data: platformStatus } = await supabase
      .from('platform_status')
      .select('active_disaster_event_id')
      .eq('status_key', 'primary')
      .maybeSingle();

    const disasterEventId = body.disasterEventId ?? platformStatus?.active_disaster_event_id ?? null;
    if (!disasterEventId) {
      return NextResponse.json({ error: 'No active disaster event found.' }, { status: 400 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Collection point name is required.' }, { status: 400 });
    }

    const { data: collectionPoint, error } = await supabase
      .from('collection_points')
      .insert({
        disaster_event_id: disasterEventId,
        name: body.name.trim(),
        type: body.type?.trim() || 'community_hub',
        address: body.address?.trim() || null,
        capacity: body.capacity ?? null,
        manager_contact: body.managerContact?.trim() || null,
        serving_regions: Array.isArray(body.servingRegions) ? body.servingRegions.filter(Boolean) : [],
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ collectionPoint }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create collection point.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
