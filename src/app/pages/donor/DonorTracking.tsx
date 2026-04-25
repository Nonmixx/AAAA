import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Package,
  MapPin,
  CheckCircle2,
  Truck,
  Clock,
  Camera,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Info,
  Users,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// Map DB enum to UI types
type TrackStatus = 'allocated' | 'scheduled' | 'in-transit' | 'delivered' | 'proof-uploaded' | 'confirmed';

const DB_TO_UI_STATUS: Record<string, TrackStatus> = {
  pending: 'allocated',
  accepted: 'scheduled',
  scheduled: 'scheduled',
  in_transit: 'in-transit',
  delivered: 'delivered',
  proof_uploaded: 'delivered',
  confirmed: 'confirmed',
};

const STEPS: { key: TrackStatus; label: string; icon: React.ElementType }[] = [
  { key: 'allocated', label: 'Allocated', icon: AlertCircle },
  { key: 'scheduled', label: 'Scheduled', icon: Clock },
  { key: 'in-transit', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Camera },
  { key: 'confirmed', label: 'Confirmed', icon: ShieldCheck },
];

/** Donor-home pickup → shelter (driven by `routing_notes.donor_logistics.milestones`, written at AI confirm). */
const PICKUP_STEPS: { key: string; label: string; hint: string; icon: React.ElementType }[] = [
  { key: 'coordinated', label: 'Coordinated', hint: 'Driver assigned', icon: CheckCircle2 },
  { key: 'picked-up', label: 'Picked up', hint: 'Collected from you', icon: Package },
  { key: 'en-route', label: 'On the way', hint: 'Heading to shelter', icon: Truck },
  { key: 'arrived', label: 'Delivered', hint: 'Dropped at destination', icon: MapPin },
];

const stepIndex = (s: TrackStatus) => STEPS.findIndex((x) => x.key === s);

const STATUS_BADGE: Record<TrackStatus, string> = {
  allocated: 'bg-slate-50 text-slate-600 border-slate-100',
  scheduled: 'bg-blue-50 text-blue-600 border-blue-100',
  'in-transit': 'bg-yellow-50 text-yellow-700 border-yellow-100',
  delivered: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  'proof-uploaded': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  confirmed: 'bg-green-50 text-green-700 border-green-100',
};

type DonorLogisticsMilestones = {
  driver_assigned_at?: string | null;
  picked_up_from_donor_at?: string | null;
  en_route_at?: string | null;
  delivered_at?: string | null;
};

function pickupTimelineLastCompleted(m: DonorLogisticsMilestones | null | undefined): number {
  if (!m?.driver_assigned_at) return -1;
  if (!m.picked_up_from_donor_at) return 0;
  if (!m.en_route_at) return 1;
  if (!m.delivered_at) return 2;
  return 3;
}

function formatTrackingRow(item: any) {
  const deliveryMethod = item.donations?.delivery_method as string | undefined;
  const logistics = item.routing_notes?.donor_logistics as
    | {
        summary?: string;
        self_dropoff?: boolean;
        driver?: { displayName?: string; reference?: string; phone?: string | null };
        milestones?: DonorLogisticsMilestones;
      }
    | undefined;

  const isPlatformPickup =
    deliveryMethod === 'platform_delivery' && logistics && !logistics.self_dropoff;

  const milestones = logistics?.milestones ?? {};
  const matchSummary = item.donations?.ai_match_summary as Record<string, unknown> | null | undefined;

  const summaryText =
    (typeof logistics?.summary === 'string' && logistics.summary.trim()) ||
    (typeof matchSummary?.trackingSummary === 'string' && String(matchSummary.trackingSummary).trim()) ||
    (typeof matchSummary?.planSummary === 'string' && String(matchSummary.planSummary).trim()) ||
    '';

  const dbUi = DB_TO_UI_STATUS[item.status] || 'allocated';

  let status: TrackStatus = dbUi;
  if (isPlatformPickup) {
    if (milestones.delivered_at || item.status === 'delivered' || item.status === 'proof_uploaded') {
      status = 'delivered';
    } else if (milestones.en_route_at || item.status === 'in_transit') {
      status = 'in-transit';
    } else if (milestones.picked_up_from_donor_at) {
      status = 'scheduled';
    } else if (milestones.driver_assigned_at) {
      status = 'scheduled';
    } else {
      status = 'allocated';
    }
  }

  const pickupLastIdx = isPlatformPickup ? pickupTimelineLastCompleted(milestones) : -1;

  const statusBadgeText =
    isPlatformPickup && milestones.picked_up_from_donor_at && !milestones.en_route_at
      ? 'Picked up'
      : isPlatformPickup && milestones.en_route_at && !milestones.delivered_at
        ? 'En route'
        : isPlatformPickup && milestones.delivered_at
          ? 'Delivered'
          : isPlatformPickup && milestones.driver_assigned_at && !milestones.picked_up_from_donor_at
            ? 'Pickup pending'
            : status;

  return {
    id: item.id.slice(0, 8).toUpperCase(),
    rawId: item.id,
    item: item.donations?.item_name || 'Donation',
    quantity: item.allocated_quantity,
    receiver: item.needs?.organizations?.name || 'Unknown',
    location: item.needs?.organizations?.location_name || item.needs?.organizations?.address || 'Location pending',
    deliveryMethod: deliveryMethod?.replace(/_/g, ' ') || 'Standard',
    deliveryMethodRaw: deliveryMethod,
    status,
    statusBadgeText: String(statusBadgeText),
    urgency: item.needs?.urgency || 'medium',
    matchReason: item.match_reason,
    estimatedArrival: item.estimated_delivery_date,
    deliveredAt: item.delivered_at,
    confirmedAt: item.confirmed_at,
    impact: `${item.impact_count || 0} ${item.impact_label || item.impact_unit || 'units'}`,
    proof: (() => {
      const proofRecord = Array.isArray(item.delivery_proofs) ? item.delivery_proofs[0] : item.delivery_proofs;
      if (!proofRecord) return null;
      return {
        imageUrl: proofRecord.image_url,
        location: proofRecord.location_text,
        timestamp: proofRecord.proof_timestamp,
      };
    })(),
    isPlatformPickup,
    pickupLastIdx,
    logisticsSummary: summaryText,
    driver: logistics?.driver ?? null,
    milestones,
  };
}

export function DonorTracking() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // Added Status Filter State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const fetchTrackingData = useCallback(async (silent?: boolean) => {
    const supabase = getSupabaseBrowserClient();
    if (!silent) setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setDonations([]);
      if (!silent) setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('donation_allocations')
      .select(`
          id, status, allocated_quantity, route_summary, routing_notes,
          impact_count, impact_unit, impact_label, created_at,
          match_reason, estimated_delivery_date, delivered_at, confirmed_at,
          donations!inner (item_name, delivery_method, donor_profile_id, ai_match_summary),
          needs (urgency, organizations (name, location_name, address)),
          delivery_proofs (image_url, proof_timestamp, location_text)
        `)
      .eq('donations.donor_profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      setDonations([]);
    } else if (data) {
      const formatted = data.map((item: any) => formatTrackingRow(item));
      setDonations(formatted);
    }
    if (!silent) setLoading(false);
  }, []);

  const handleConfirmReceipt = async (rawId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('donation_allocations')
      .update({ 
        status: 'confirmed', 
        confirmed_at: new Date().toISOString() 
      })
      .eq('id', rawId);

    if (error) {
      console.error('Error confirming receipt:', error);
      alert('Failed to update status. Please try again.');
      return;
    }

    setDonations((prev) =>
      prev.map((d) =>
        d.rawId === rawId ? { ...d, status: 'confirmed', confirmedAt: new Date().toISOString() } : d
      )
    );
  };

  const advancePickupDemo = async (rawId: string) => {
    setAdvancingId(rawId);
    try {
      const res = await fetch(`/api/donor/allocations/${rawId}/pickup-milestone`, { method: 'POST' });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Unable to update pickup status.');
      await fetchTrackingData(true);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setAdvancingId(null);
    }
  };

  useEffect(() => {
    void fetchTrackingData(false);
    const id = window.setInterval(() => void fetchTrackingData(true), 15000);
    return () => window.clearInterval(id);
  }, [fetchTrackingData]);

  // Search by Item, ID, or Receiver (Org Name)
  const filteredData = useMemo(() => {
    return donations.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        d.item.toLowerCase().includes(q) ||
        d.id.includes(searchQuery.toUpperCase()) ||
        d.receiver.toLowerCase().includes(q) ||
        (typeof d.logisticsSummary === 'string' && d.logisticsSummary.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [donations, searchQuery, statusFilter]);

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Syncing with logistics...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Your Impact Journey</h1>
        <p className="text-slate-500">Monitor the progress of your contributions.</p>
        
        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4">
          {/* Search Bar - Now includes Destination Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search items, IDs, or destinations..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#da1a32] transition-all"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Category Filter */}
          <div className="flex flex-wrap gap-2">
            {['all', ...STEPS.map(s => s.key)].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                  statusFilter === status
                    ? 'bg-[#da1a32] border-[#da1a32] text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-[#da1a32] hover:text-[#da1a32]'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredData.length === 0 && (
           <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
             <p className="text-slate-400">No donations match your current filters.</p>
             <p className="mt-2 text-xs text-slate-500">
               Finish confirmation from AI Donation by tapping <strong>Drop off yourself</strong> or <strong>Logistics partner pickup</strong>.
             </p>
           </div>
        )}

        {filteredData.map((donation) => {
          const isExpanded = expandedId === donation.rawId;
          const showPickupTimeline =
            donation.isPlatformPickup && typeof donation.milestones?.driver_assigned_at === 'string';

          const legacyIdx = stepIndex(donation.status);
          const pickupIdx = showPickupTimeline ? donation.pickupLastIdx : legacyIdx;

          const timelineSteps = showPickupTimeline ? PICKUP_STEPS : STEPS;
          const currentIdx = showPickupTimeline ? pickupIdx : legacyIdx;
          const barDen = Math.max(1, timelineSteps.length - 1);

          const isDeliveredOrAfter = showPickupTimeline
            ? Boolean(donation.milestones?.delivered_at)
            : legacyIdx >= stepIndex('delivered');
          const arrivalDate =
            donation.confirmedAt ||
            donation.deliveredAt ||
            donation.milestones?.delivered_at ||
            donation.proof?.timestamp;

          const dateLabel = isDeliveredOrAfter ? 'Arrived At' : 'ETA';
          const dateValue = isDeliveredOrAfter
            ? arrivalDate
              ? new Date(arrivalDate as string).toLocaleDateString()
              : 'N/A'
            : donation.estimatedArrival
              ? new Date(donation.estimatedArrival).toLocaleDateString()
              : 'TBD';

          const pickupIncomplete =
            showPickupTimeline &&
            !donation.milestones?.delivered_at &&
            process.env.NODE_ENV === 'development';

          return (
            <div key={donation.rawId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <button 
                onClick={() => setExpandedId(isExpanded ? null : donation.rawId)}
                className="w-full p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left"
              >
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                    donation.urgency === 'high' ? 'bg-red-50 border-red-100 text-[#da1a32]' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <Package size={24} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{donation.item}</h3>
                      {donation.urgency === 'high' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">Priority</span>
                      )}
                    </div>
                    <p className="text-slate-400 font-mono text-xs">TRK-{donation.id}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 md:gap-6 w-full md:w-auto mt-2 md:mt-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Destination</p>
                    <p className="text-sm font-semibold text-slate-700">{donation.receiver}</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      STATUS_BADGE[donation.status as TrackStatus] ?? STATUS_BADGE.allocated
                    }`}
                  >
                    {donation.statusBadgeText}
                  </div>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                  <hr className="mb-6 border-slate-100" />
                  
                  {/* Progress timeline: platform pickup uses shelter-route milestones; others use allocation status. */}
                  <div className="mb-10 px-4">
                    <div className="relative flex justify-between">
                      <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100" />
                      <div
                        className="absolute top-5 left-0 h-[2px] bg-[#da1a32] transition-all duration-700"
                        style={{ width: `${(currentIdx / barDen) * 100}%` }}
                      />
                      {showPickupTimeline
                        ? PICKUP_STEPS.map((step, i) => (
                            <div key={step.key} className="relative z-10 flex flex-col items-center max-w-[22%]">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${
                                  i <= currentIdx
                                    ? 'bg-[#da1a32] border-white shadow-md text-white'
                                    : 'bg-white border-slate-100 text-slate-300'
                                }`}
                              >
                                <step.icon size={14} />
                              </div>
                              <span
                                className={`mt-3 text-[9px] font-bold uppercase text-center leading-tight ${
                                  i <= currentIdx ? 'text-slate-900' : 'text-slate-300'
                                }`}
                              >
                                {step.label}
                              </span>
                              <span className="mt-0.5 text-[8px] text-slate-400 text-center leading-tight hidden sm:block">
                                {step.hint}
                              </span>
                            </div>
                          ))
                        : STEPS.map((step, i) => (
                            <div key={step.key} className="relative z-10 flex flex-col items-center">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${
                                  i <= currentIdx
                                    ? 'bg-[#da1a32] border-white shadow-md text-white'
                                    : 'bg-white border-slate-100 text-slate-300'
                                }`}
                              >
                                <step.icon size={14} />
                              </div>
                              <span
                                className={`mt-3 text-[9px] font-bold uppercase ${i <= currentIdx ? 'text-slate-900' : 'text-slate-300'}`}
                              >
                                {step.label}
                              </span>
                            </div>
                          ))}
                    </div>
                  </div>

                  {showPickupTimeline && donation.driver && (
                    <div className="mb-6 flex gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/80">
                      <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#da1a32] shrink-0">
                        <Users size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pickup driver</p>
                        <p className="text-sm font-bold text-slate-900">{donation.driver.displayName || 'Assigned driver'}</p>
                        {donation.driver.reference && (
                          <p className="text-xs font-mono text-slate-500 mt-0.5">Ref {donation.driver.reference}</p>
                        )}
                        {donation.driver.phone && (
                          <p className="text-xs text-slate-600 mt-1">{donation.driver.phone}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {donation.logisticsSummary && (
                    <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">From your donation chat</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{donation.logisticsSummary}</p>
                    </div>
                  )}

                  {pickupIncomplete && (
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={advancingId === donation.rawId}
                        onClick={() => void advancePickupDemo(donation.rawId)}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg border border-dashed border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {advancingId === donation.rawId ? 'Updating…' : 'Simulate next pickup step (dev)'}
                      </button>
                      <span className="text-xs text-slate-500">
                        Advances picked up → on the way → delivered. Wire this to your driver app or ops dashboard in production.
                      </span>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <DetailBox label="Address" value={donation.location} icon={MapPin} />
                    <DetailBox label="Method" value={donation.deliveryMethod} icon={Truck} />
                    <DetailBox label="Quantity" value={`${donation.quantity} Units`} icon={Package} />
                    <DetailBox 
                      label={dateLabel}
                      value={dateValue}
                      icon={Calendar}
                    />
                  </div>

                  {donation.matchReason && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 items-start">
                      <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-800 italic">
                        <span className="text-blue-400">&ldquo;</span> {donation.matchReason}{' '}
                        <span className="text-blue-400">&rdquo;</span>
                      </p>
                    </div>
                  )}

                  {donation.proof && (
                    <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl flex gap-4 items-center">
                      <img src={donation.proof.imageUrl} className="w-24 h-24 rounded-lg object-cover border-2 border-white shadow-sm" alt="Proof" />
                      <div>
                        <p className="text-green-700 text-sm font-bold flex items-center gap-1">
                          <ShieldCheck size={16} /> Verified Impact
                        </p>
                        <p className="text-slate-600 text-sm mt-1">
                          Reached {donation.proof.location}. Total impact: <strong>{donation.impact}</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {donation.status === 'delivered' && (
                    <div className="mt-6 flex justify-end border-t border-slate-100 pt-6">
                      <button
                        onClick={() => handleConfirmReceipt(donation.rawId)}
                        className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm"
                      >
                        Received
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailBox({ label, value, icon: Icon }: any) {
  return (
    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold">
        {Icon && <Icon size={14} className="text-[#da1a32]" />}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}