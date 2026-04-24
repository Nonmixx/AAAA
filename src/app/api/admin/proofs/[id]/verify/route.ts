import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/disaster/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authClient = await getSupabaseServerClient();
    const profile = await requireAdmin(authClient);
    const supabase = getSupabaseAdminClient();
    const body = (await req.json()) as {
      status?: 'pending' | 'verified' | 'review_required' | 'rejected';
      confidence?: number | null;
      notes?: string | null;
    };
    const { id } = await context.params;

    if (!body.status) {
      return NextResponse.json({ error: 'status is required.' }, { status: 400 });
    }

    const { data: proof, error: proofError } = await supabase
      .from('delivery_proofs')
      .select('id, allocation_id')
      .eq('id', id)
      .single();

    if (proofError) throw proofError;

    const now = new Date().toISOString();
    const { data: updatedProof, error: updateError } = await supabase
      .from('delivery_proofs')
      .update({
        proof_verification_status: body.status,
        verification_confidence: body.confidence ?? null,
        verification_notes: body.notes?.trim() || null,
        confirmed_by_profile_id: profile.id,
        confirmed_at: body.status === 'verified' ? now : null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    if (body.status === 'verified') {
      await supabase
        .from('donation_allocations')
        .update({ status: 'proof_uploaded' })
        .eq('id', proof.allocation_id);

      const { data: routeAllocation } = await supabase
        .from('route_allocations')
        .select('route_plan_id, route_stop_id')
        .eq('allocation_id', proof.allocation_id)
        .maybeSingle();

      if (routeAllocation?.route_stop_id) {
        await supabase
          .from('route_stops')
          .update({ status: 'completed', completed_at: now, updated_at: now })
          .eq('id', routeAllocation.route_stop_id);
      }

      if (routeAllocation?.route_plan_id) {
        const { data: siblingStops } = await supabase
          .from('route_stops')
          .select('status')
          .eq('route_plan_id', routeAllocation.route_plan_id);

        const allCompleted = (siblingStops ?? []).every((stop) => stop.status === 'completed');
        await supabase
          .from('route_plans')
          .update({
            status: allCompleted ? 'completed' : 'in_progress',
            completed_at: allCompleted ? now : null,
            started_at: allCompleted ? undefined : now,
            updated_at: now,
          })
          .eq('id', routeAllocation.route_plan_id);
      }
    }

    return NextResponse.json({ proof: updatedProof });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify proof.';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
