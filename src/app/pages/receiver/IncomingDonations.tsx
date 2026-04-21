// @ts-nocheck
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Package, User, Check, X, Clock, Camera, ShieldCheck, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentReceiverContext } from '@/lib/supabase/receiver';

type DonationStatus =
  | 'pending'
  | 'accepted'
  | 'scheduled'
  | 'in_transit'
  | 'delivered'
  | 'proof_uploaded'
  | 'confirmed'
  | 'rejected';

type Filter = 'all' | DonationStatus;

type DonationCard = {
  id: string;
  status: DonationStatus;
  quantity: number;
  estimatedDelivery: string | null;
  itemName: string;
  donorName: string;
  proof?: {
    imageUrl: string;
    timestamp: string;
    location: string;
  };
};

const STATUS_BADGE: Record<DonationStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-50 text-yellow-600 border-yellow-100', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-50 text-green-600 border-green-100', icon: Check },
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Clock },
  in_transit: { label: 'In Transit', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Package },
  delivered: { label: 'Delivered', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Package },
  proof_uploaded: { label: 'Proof Uploaded', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: Camera },
  confirmed: { label: 'Confirmed Received', color: 'bg-green-50 text-green-700 border-green-100', icon: ShieldCheck },
  rejected: { label: 'Rejected', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: X },
};

export function IncomingDonations() {
  const [donations, setDonations] = useState<DonationCard[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All Donations' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const loadIncomingDonations = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const context = await getCurrentReceiverContext();

      const { data: needs, error: needsError } = await supabase
        .from('needs')
        .select('id')
        .eq('organization_id', context.organization.id);

      if (needsError) throw needsError;

      const needIds = (needs ?? []).map((n) => n.id);
      if (needIds.length === 0) {
        setDonations([]);
        return;
      }

      const { data: allocations, error: allocationsError } = await supabase
        .from('donation_allocations')
        .select('id, status, allocated_quantity, estimated_delivery_date, donation_id')
        .in('need_id', needIds)
        .order('created_at', { ascending: false });

      if (allocationsError) throw allocationsError;
      if (!allocations || allocations.length === 0) {
        setDonations([]);
        return;
      }

      const donationIds = allocations.map((a) => a.donation_id);
      const allocationIds = allocations.map((a) => a.id);

      const { data: donationRows, error: donationError } = await supabase
        .from('donations')
        .select('id, item_name, donor_profile_id')
        .in('id', donationIds);

      if (donationError) throw donationError;

      const donorIds = (donationRows ?? []).map((d) => d.donor_profile_id);
      const { data: donorRows, error: donorError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', donorIds);

      if (donorError) throw donorError;

      const { data: proofRows, error: proofError } = await supabase
        .from('delivery_proofs')
        .select('allocation_id, image_url, proof_timestamp, location_text')
        .in('allocation_id', allocationIds);

      if (proofError) throw proofError;

      const donationsMap = new Map((donationRows ?? []).map((d) => [d.id, d]));
      const donorMap = new Map((donorRows ?? []).map((d) => [d.id, d.full_name]));
      const proofMap = new Map((proofRows ?? []).map((p) => [p.allocation_id, p]));

      const cards: DonationCard[] = allocations.map((row) => {
        const donation = donationsMap.get(row.donation_id);
        const proof = proofMap.get(row.id);

        return {
          id: row.id,
          status: row.status as DonationStatus,
          quantity: row.allocated_quantity,
          estimatedDelivery: row.estimated_delivery_date,
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

      setDonations(cards);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIncomingDonations();
  }, []);

  const updateStatus = async (id: string, status: DonationStatus) => {
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: previous, error: previousError } = await supabase
        .from('donation_allocations')
        .select('donation_id, status')
        .eq('id', id)
        .single();

      if (previousError) throw previousError;

      const { error: updateError } = await supabase
        .from('donation_allocations')
        .update({ status })
        .eq('id', id);

      if (updateError) throw updateError;

      await supabase.from('donation_events').insert({
        donation_id: previous.donation_id,
        allocation_id: id,
        event_type: 'allocation_status_changed',
        from_status: previous.status,
        to_status: status,
        actor_profile_id: user?.id ?? null,
      });

      setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to update status.');
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return donations;
    return donations.filter((d) => d.status === filter);
  }, [donations, filter]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Incoming Donations</h1>
        <p className="text-gray-600">Review and manage donation offers from donors</p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 flex gap-3 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-[#da1a32] text-white shadow-sm'
                : 'bg-white border-2 border-[#e5e5e5] text-[#000000] hover:bg-[#edf2f4]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {loading && <div className="text-center py-16 text-gray-400">Loading donations...</div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">No donations in this category.</div>
        )}

        {filtered.map((donation) => {
          const badge = STATUS_BADGE[donation.status];
          const BadgeIcon = badge.icon;

          return (
            <div key={donation.id} className="bg-white rounded-2xl border-2 shadow-sm overflow-hidden border-[#e5e5e5]">
              <div className="p-6 border-b border-[#edf2f4]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl text-[#000000] font-bold">{donation.itemName}</h3>
                        <span className="text-sm text-gray-400">#{donation.id}</span>
                      </div>
                      <div className="text-lg">
                        <span className="font-medium text-[#000000]">{donation.quantity} units</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 border font-medium flex-shrink-0 ${badge.color}`}>
                    <BadgeIcon className="w-4 h-4" />
                    {badge.label}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-[#edf2f4]">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-[#da1a32]" />
                      <div className="text-xs text-gray-600">Donor</div>
                    </div>
                    <div className="font-medium text-[#000000] text-sm">{donation.donorName}</div>
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-[#da1a32]" />
                      <div className="text-xs text-gray-600">Expected</div>
                    </div>
                    <div className="font-medium text-[#000000] text-sm">
                      {donation.estimatedDelivery ? new Date(donation.estimatedDelivery).toLocaleDateString('en-GB') : 'Not set'}
                    </div>
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-[#da1a32]" />
                      <div className="text-xs text-gray-600">Status</div>
                    </div>
                    <div className="font-medium text-[#000000] text-sm">{badge.label}</div>
                  </div>
                </div>
              </div>

              {donation.proof && (donation.status === 'proof_uploaded' || donation.status === 'confirmed' || donation.status === 'delivered') && (
                <div className="px-6 py-5 border-b border-[#edf2f4]">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 text-[#da1a32]" />
                    <h4 className="font-bold text-[#000000]">Proof of Delivery</h4>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-44 h-28 rounded-xl overflow-hidden border-2 border-[#e5e5e5] flex-shrink-0">
                      <img src={donation.proof.imageUrl} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <div className="text-sm">
                        <span className="text-gray-500">Timestamp:</span> <span className="font-medium text-[#000000]">{donation.proof.timestamp}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Location:</span> <span className="font-medium text-[#000000]">{donation.proof.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-6 py-4">
                {donation.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => void updateStatus(donation.id, 'accepted')}
                      className="flex-1 bg-[#da1a32] text-white py-3 rounded-xl hover:bg-[#b01528] transition-all flex items-center justify-center gap-2 shadow-lg font-medium"
                    >
                      <Check className="w-5 h-5" />
                      Accept Donation
                    </button>
                    <button
                      onClick={() => void updateStatus(donation.id, 'rejected')}
                      className="flex-1 bg-white border-2 border-[#e5e5e5] text-[#000000] py-3 rounded-xl hover:bg-[#edf2f4] transition-all flex items-center justify-center gap-2 font-medium"
                    >
                      <X className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                )}

                {donation.status === 'delivered' || donation.status === 'proof_uploaded' ? (
                  <button
                    onClick={() => void updateStatus(donation.id, 'confirmed')}
                    className="w-full bg-[#000000] text-white py-3 rounded-xl hover:bg-[#da1a32] transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Confirm Received
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
