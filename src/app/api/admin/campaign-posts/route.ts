import { NextResponse } from 'next/server';
import { publishCampaignPost } from '@/lib/disaster/providers/campaigns';
import { requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const authClient = await getSupabaseServerClient();
    const profile = await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const body = (await req.json()) as {
      disasterEventId?: string;
      platform?: 'facebook' | 'instagram';
      title?: string;
      body?: string;
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

    if (!body.body?.trim()) {
      return NextResponse.json({ error: 'Campaign body is required.' }, { status: 400 });
    }

    const providerResponse = await publishCampaignPost({
      platform: body.platform ?? 'facebook',
      message: body.body.trim(),
    });

    const externalPostId =
      typeof providerResponse === 'object' && providerResponse
        ? String(
            (providerResponse as Record<string, unknown>).id ??
              (providerResponse as Record<string, unknown>).post_id ??
              '',
          ) || null
        : null;

    const { data: campaignPost, error } = await supabase
      .from('campaign_posts')
      .insert({
        disaster_event_id: disasterEventId,
        platform: body.platform ?? 'facebook',
        status: 'published',
        title: body.title?.trim() || null,
        body: body.body.trim(),
        external_post_id: externalPostId,
        published_at: new Date().toISOString(),
        metadata: {
          createdBy: profile.id,
          providerResponse,
        },
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ campaignPost, providerResponse }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to publish campaign post.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
