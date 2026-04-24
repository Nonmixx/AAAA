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
      communicationId?: string;
      organizationId?: string;
      disasterEventId?: string;
      title?: string;
      category?: string;
      quantityRequested?: number;
      urgency?: 'low' | 'medium' | 'high';
      beneficiaryCount?: number | null;
    };

    if (!body.communicationId || !body.title?.trim() || !body.category?.trim()) {
      return NextResponse.json(
        { error: 'communicationId, title, and category are required.' },
        { status: 400 },
      );
    }

    const { data: communication, error: communicationError } = await supabase
      .from('communications')
      .select('*')
      .eq('id', body.communicationId)
      .single();

    if (communicationError) throw communicationError;

    const disasterEventId = body.disasterEventId ?? communication.disaster_event_id ?? null;
    const organizationId = body.organizationId ?? communication.organization_id ?? null;

    if (!disasterEventId || !organizationId) {
      return NextResponse.json(
        { error: 'The communication must be linked to an organization and active disaster event.' },
        { status: 400 },
      );
    }

    const { data: need, error: needError } = await supabase
      .from('needs')
      .insert({
        organization_id: organizationId,
        disaster_event_id: disasterEventId,
        title: body.title.trim(),
        description: communication.transcript || 'Promoted from shelter communication.',
        category: body.category.trim(),
        urgency: body.urgency ?? 'high',
        quantity_requested: Math.max(1, Number(body.quantityRequested ?? 1)),
        quantity_fulfilled: 0,
        status: 'active',
        is_emergency: true,
        beneficiary_count: body.beneficiaryCount ?? null,
        source: 'communication_promoted',
      })
      .select('*')
      .single();

    if (needError) throw needError;

    await supabase.from('communications').update({
      metadata: {
        ...(typeof communication.metadata === 'object' && communication.metadata ? communication.metadata : {}),
        promotedNeedId: need.id,
      },
    }).eq('id', body.communicationId);

    return NextResponse.json({ need }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to promote communication into need.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
