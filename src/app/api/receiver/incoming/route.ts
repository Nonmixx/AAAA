import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const authClient = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile || (profile.role !== 'receiver' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Only receiver accounts can access incoming donations.' }, { status: 403 });
    }

    const { data: ownedOrganization, error: ownedOrgError } = await authClient
      .from('organizations')
      .select('id')
      .eq('owner_profile_id', user.id)
      .maybeSingle();

    if (ownedOrgError) throw ownedOrgError;

    let organizationId = ownedOrganization?.id ?? null;

    if (!organizationId) {
      const { data: membership, error: membershipError } = await authClient
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;
      organizationId = membership?.organization_id ?? null;
    }

    if (!organizationId) {
      return NextResponse.json({ donations: [] });
    }

    const supabase = getSupabaseAdminClient();

    const { data: needs, error: needsError } = await supabase
      .from('needs')
      .select('id, title')
      .eq('organization_id', organizationId);

    if (needsError) throw needsError;

    const needIds = (needs ?? []).map((need) => need.id);
    const needMap = new Map((needs ?? []).map((need) => [need.id, need.title]));
    if (needIds.length === 0) {
      return NextResponse.json({ donations: [] });
    }

    const { data: allocations, error: allocationsError } = await supabase
      .from('donation_allocations')
      .select('id, need_id, status, allocated_quantity, estimated_delivery_date, donation_id')
      .in('need_id', needIds)
      .order('created_at', { ascending: false });

    if (allocationsError) throw allocationsError;
    if (!allocations?.length) {
      return NextResponse.json({ donations: [] });
    }

    const ownedAllocations = allocations.filter((allocation) => needMap.has(allocation.need_id));
    if (!ownedAllocations.length) {
      return NextResponse.json({ donations: [] });
    }

    const donationIds = ownedAllocations.map((allocation) => allocation.donation_id);
    const allocationIds = ownedAllocations.map((allocation) => allocation.id);

    const { data: donationRows, error: donationError } = await supabase
      .from('donations')
      .select('id, item_name, donor_profile_id')
      .in('id', donationIds);

    if (donationError) throw donationError;

    const donorIds = (donationRows ?? []).map((donation) => donation.donor_profile_id);

    const { data: donorRows, error: donorError } = donorIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', donorIds)
      : { data: [], error: null };

    if (donorError) throw donorError;

    const { data: proofRows, error: proofError } = allocationIds.length
      ? await supabase
          .from('delivery_proofs')
          .select('allocation_id, image_url, proof_timestamp, location_text')
          .in('allocation_id', allocationIds)
      : { data: [], error: null };

    if (proofError) throw proofError;

    const donationsMap = new Map((donationRows ?? []).map((donation) => [donation.id, donation]));
    const donorMap = new Map((donorRows ?? []).map((donor) => [donor.id, donor.full_name]));
    const proofMap = new Map((proofRows ?? []).map((proof) => [proof.allocation_id, proof]));

    const cards = ownedAllocations.map((allocation) => {
      const donation = donationsMap.get(allocation.donation_id);
      const proof = proofMap.get(allocation.id);

      return {
        id: allocation.id,
        needId: allocation.need_id,
        needTitle: needMap.get(allocation.need_id) ?? 'Need Post',
        status: allocation.status,
        quantity: allocation.allocated_quantity,
        estimatedDelivery: allocation.estimated_delivery_date,
        itemName: donation?.item_name ?? 'Donation Item',
        donorName: donorMap.get(donation?.donor_profile_id ?? '') ?? 'Donor',
        proof: proof
          ? {
              imageUrl: proof.image_url,
              timestamp: new Date(proof.proof_timestamp).toLocaleString('en-GB'),
              location: proof.location_text ?? 'Unknown location',
            }
          : undefined,
      };
    });

    return NextResponse.json({ donations: cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load incoming donations.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
