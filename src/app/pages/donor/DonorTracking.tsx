import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  Users,
  XCircle,
  Ban,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type ProgressStatus = 'allocated' | 'scheduled' | 'in-transit' | 'delivered' | 'proof-uploaded' | 'confirmed';
type AllocationStatus =
  | 'pending'
  | 'accepted'
  | 'scheduled'
  | 'in_transit'
  | 'delivered'
  | 'proof_uploaded'
  | 'confirmed'
  | 'rejected'
  | 'cancelled';

type AllocationRow = {
  id: string;
  status: AllocationStatus;
  allocated_quantity: number;
  delivery_method: 'platform_delivery' | 'self_delivery' | 'pickup' | null;
  estimated_delivery_date: string | null;
  route_summary: string | null;
  created_at: string;
  delivered_at: string | null;
  confirmed_at: string | null;
  donations:
    | {
        id: string;
        item_name: string;
        quantity_total: number;
        created_at: string;
      }
    | {
        id: string;
        item_name: string;
        quantity_total: number;
        created_at: string;
      }[]
    | null;
  needs:
    | {
        title: string;
        organizations:
          | {
              name: string;
              address: string | null;
            }
          | {
              name: string;
              address: string | null;
            }[]
          | null;
      }
    | {
        title: string;
        organizations:
          | {
              name: string;
              address: string | null;
            }
          | {
              name: string;
              address: string | null;
            }[]
          | null;
      }[]
    | null;
  delivery_proofs:
    | {
        image_url: string;
        proof_timestamp: string;
        location_text: string | null;
        confirmed_at: string | null;
      }
    | {
        image_url: string;
        proof_timestamp: string;
        location_text: string | null;
        confirmed_at: string | null;
      }[]
    | null;
};

type DonationSummaryRow = {
  id: string;
  quantity_total: number;
  created_at: string;
};

type TrackingCard = {
  id: string;
  donationId: string;
  item: string;
  quantity: number;
  receiverName: string;
  receiverAddress: string | null;
  needTitle: string;
  deliveryMethod: string;
  route: string;
  status: AllocationStatus;
  progressStatus: ProgressStatus | null;
  date: string;
  estimatedDeliveryDate: string | null;
  deliveredAt: string | null;
  confirmedAt: string | null;
  proof?: { imageUrl: string; timestamp: string; location: string; confirmed: boolean };
};

const STEPS: { key: ProgressStatus; label: string; icon: React.ElementType }[] = [
  { key: 'allocated', label: 'Allocated', icon: AlertCircle },
  { key: 'scheduled', label: 'Scheduled', icon: Clock },
  { key: 'in-transit', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'proof-uploaded', label: 'Proof Uploaded', icon: Camera },
  { key: 'confirmed', label: 'Confirmed', icon: ShieldCheck },
];

const STATUS_BADGE: Record<
  AllocationStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: 'Pending Review', color: 'bg-[#edf2f4] text-[#000000] border-[#e5e5e5]', icon: AlertCircle },
  accepted: { label: 'Accepted', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: CheckCircle2 },
  scheduled: { label: 'Scheduled', color: 'bg-[#edf2f4] text-[#000000] border-[#e5e5e5]', icon: Clock },
  in_transit: { label: 'In Transit', color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Package },
  proof_uploaded: { label: 'Proof Uploaded', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: Camera },
  confirmed: { label: 'Confirmed', color: 'bg-green-50 text-green-700 border-green-100', icon: ShieldCheck },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-100', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: Ban },
};

function stepIndex(status: ProgressStatus) {
  return STEPS.findIndex((x) => x.key === status);
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDeliveryMethod(method: TrackingCard['deliveryMethod']) {
  return method
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeProgressStatus(status: AllocationStatus): ProgressStatus | null {
  if (status === 'pending' || status === 'accepted') return 'allocated';
  if (status === 'scheduled') return 'scheduled';
  if (status === 'in_transit') return 'in-transit';
  if (status === 'delivered') return 'delivered';
  if (status === 'proof_uploaded') return 'proof-uploaded';
  if (status === 'confirmed') return 'confirmed';
  return null;
}

function getRouteLabel(receiverName: string, receiverAddress: string | null, routeSummary: string | null) {
  if (routeSummary?.trim()) return routeSummary.trim();
  if (receiverAddress?.trim()) return receiverAddress.trim();
  return receiverName;
}

function getStatusMessage(card: TrackingCard) {
  if (card.status === 'pending') {
    return {
      icon: AlertCircle,
      className: 'bg-[#edf2f4] border border-[#e5e5e5] text-gray-600',
      text: 'The receiver has not reviewed this donation yet.',
    };
  }

  if (card.status === 'accepted') {
    return {
      icon: CheckCircle2,
      className: 'bg-blue-50 border border-blue-100 text-blue-700',
      text: 'The receiver has accepted this donation and logistics can proceed.',
    };
  }

  if (card.status === 'scheduled') {
    return {
      icon: Clock,
      className: 'bg-[#edf2f4] border border-[#e5e5e5] text-gray-600',
      text: card.estimatedDeliveryDate
        ? `Delivery scheduled for ${formatDate(card.estimatedDeliveryDate)}.`
        : 'Delivery has been scheduled and is awaiting the next handoff.',
    };
  }

  if (card.status === 'in_transit') {
    return {
      icon: Truck,
      className: 'bg-yellow-50 border border-yellow-100 text-yellow-700',
      text: card.estimatedDeliveryDate
        ? `Estimated delivery on ${formatDate(card.estimatedDeliveryDate)}.`
        : 'This donation is currently in transit to the receiver.',
    };
  }

  if (card.status === 'delivered') {
    return {
      icon: Package,
      className: 'bg-blue-50 border border-blue-100 text-blue-700',
      text: card.deliveredAt
        ? `Delivered on ${formatDate(card.deliveredAt)} and awaiting proof or confirmation.`
        : 'This donation is marked as delivered.',
    };
  }

  if (card.status === 'proof_uploaded') {
    return {
      icon: Camera,
      className: 'bg-purple-50 border border-purple-100 text-purple-700',
      text: 'Proof of delivery has been uploaded and is waiting for receiver confirmation.',
    };
  }

  if (card.status === 'confirmed') {
    return {
      icon: ShieldCheck,
      className: 'bg-green-50 border border-green-100 text-green-700',
      text: card.confirmedAt
        ? `Receiver confirmed receipt on ${formatDate(card.confirmedAt)}.`
        : 'Receiver confirmed receipt of this donation.',
    };
  }

  if (card.status === 'rejected') {
    return {
      icon: XCircle,
      className: 'bg-red-50 border border-red-100 text-red-700',
      text: 'This allocation was rejected by the receiver.',
    };
  }

  return {
    icon: Ban,
    className: 'bg-gray-50 border border-gray-200 text-gray-600',
    text: 'This allocation was cancelled.',
  };
}

function mapAllocationToCard(row: AllocationRow): TrackingCard | null {
  const donation = one(row.donations);
  const need = one(row.needs);
  const organization = one(need?.organizations);
  const proof = one(row.delivery_proofs);

  if (!donation || !need || !organization) return null;

  return {
    id: row.id,
    donationId: donation.id,
    item: donation.item_name,
    quantity: row.allocated_quantity,
    receiverName: organization.name,
    receiverAddress: organization.address,
    needTitle: need.title,
    deliveryMethod: row.delivery_method ?? 'platform_delivery',
    route: getRouteLabel(organization.name, organization.address, row.route_summary),
    status: row.status,
    progressStatus: normalizeProgressStatus(row.status),
    date: donation.created_at,
    estimatedDeliveryDate: row.estimated_delivery_date,
    deliveredAt: row.delivered_at,
    confirmedAt: row.confirmed_at,
    proof: proof
      ? {
          imageUrl: proof.image_url,
          timestamp: new Date(proof.proof_timestamp).toLocaleString('en-GB'),
          location: proof.location_text ?? organization.address ?? organization.name,
          confirmed: !!proof.confirmed_at || row.status === 'confirmed',
        }
      : undefined,
  };
}

export function DonorTracking() {
  const [cards, setCards] = useState<TrackingCard[]>([]);
  const [donations, setDonations] = useState<DonationSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadTracking = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error('Please log in to view your donation tracking.');

        const donationsResult = await supabase
          .from('donations')
          .select('id, quantity_total, created_at')
          .eq('donor_profile_id', user.id)
          .order('created_at', { ascending: false });
        if (donationsResult.error) throw donationsResult.error;

        const donationIds = (donationsResult.data ?? []).map((donation) => donation.id);
        const allocationsResult = donationIds.length
          ? await supabase
              .from('donation_allocations')
              .select(
                'id, donation_id, status, allocated_quantity, delivery_method, estimated_delivery_date, route_summary, created_at, delivered_at, confirmed_at, donations(id, item_name, quantity_total, created_at), needs(title, organizations(name, address)), delivery_proofs(image_url, proof_timestamp, location_text, confirmed_at)'
              )
              .in('donation_id', donationIds)
              .order('created_at', { ascending: false })
          : { data: [], error: null };

        if (allocationsResult.error) throw allocationsResult.error;

        const liveCards = ((allocationsResult.data ?? []) as AllocationRow[])
          .map(mapAllocationToCard)
          .filter((card): card is TrackingCard => card !== null);

        setDonations((donationsResult.data ?? []) as DonationSummaryRow[]);
        setCards(liveCards);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load donation tracking.');
      } finally {
        setLoading(false);
      }
    };

    void loadTracking();
  }, []);

  const summary = useMemo(() => {
    const totalDonations = donations.length;
    const totalItems = donations.reduce((sum, donation) => sum + donation.quantity_total, 0);
    const receiversHelped = new Set(cards.map((card) => card.receiverName)).size;
    const confirmedDeliveries = cards.filter((card) => card.status === 'confirmed').length;

    return [
      { icon: Heart, label: 'Total Donations', value: loading ? '-' : String(totalDonations) },
      { icon: Package, label: 'Items Donated', value: loading ? '-' : totalItems.toLocaleString('en-MY') },
      { icon: Users, label: 'Receivers Reached', value: loading ? '-' : String(receiversHelped) },
      { icon: CheckCircle2, label: 'Confirmed Deliveries', value: loading ? '-' : String(confirmedDeliveries) },
    ];
  }, [cards, donations, loading]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Track Your Donations</h1>
        <p className="text-gray-600">Monitor the live status of every donation allocation from the database</p>
      </div>

      <div className="bg-gradient-to-r from-[#000000] to-[#1a1a1a] rounded-2xl p-6 mb-8 text-white flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 bg-[#da1a32] rounded-2xl flex items-center justify-center flex-shrink-0">
            <Heart className="w-7 h-7 text-white" fill="white" />
          </div>
          <div>
            <p className="text-white opacity-60 text-sm mb-0.5">Live Summary</p>
            <p className="text-2xl font-bold">
              {loading ? 'Loading your donations...' : 'Your donation history is now showing real platform data'}
            </p>
          </div>
        </div>
        <div className="flex gap-6 flex-wrap">
          {summary.map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center min-w-[88px]">
              <Icon className="w-5 h-5 text-[#da1a32] mx-auto mb-1" />
              <div className="text-xl font-bold">{value}</div>
              <div className="text-xs text-white opacity-50">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-8 text-center text-sm text-gray-500">
          Loading live donation tracking...
        </div>
      )}

      {!loading && cards.length === 0 && !errorMessage && (
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-8 text-center text-sm text-gray-500">
          No tracked donation allocations yet. Once a donation is submitted and allocated, it will appear here.
        </div>
      )}

      <div className="space-y-6">
        {cards.map((card) => {
          const badge = STATUS_BADGE[card.status];
          const BadgeIcon = badge.icon;
          const statusMessage = getStatusMessage(card);
          const StatusMessageIcon = statusMessage.icon;
          const currentIdx = card.progressStatus ? stepIndex(card.progressStatus) : -1;

          return (
            <div key={card.id} className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#edf2f4]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-xl text-[#000000] font-bold">{card.item}</h3>
                        <span className="text-sm text-gray-400">Allocation #{card.id.slice(0, 8)}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Quantity: <span className="font-medium text-[#000000]">{card.quantity} units</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Donation date: {formatDate(card.date)} • Donation #{card.donationId.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 border font-medium flex-shrink-0 ${badge.color}`}>
                    <BadgeIcon className="w-4 h-4" />
                    {badge.label}
                  </span>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-[#edf2f4]">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="text-xs text-gray-500 mb-1">Allocated To</div>
                    <div className="font-medium text-sm text-[#000000]">{card.receiverName}</div>
                    <div className="text-xs text-gray-500 mt-1">{card.needTitle}</div>
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="text-xs text-gray-500 mb-1">Delivery Method</div>
                    <div className="font-medium text-[#000000]">{formatDeliveryMethod(card.deliveryMethod)}</div>
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="text-xs text-gray-500 mb-1">Route</div>
                    <div className="font-medium text-sm flex items-center gap-1 text-[#000000]">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      {card.route}
                    </div>
                  </div>
                </div>
              </div>

              {card.progressStatus ? (
                <div className="px-6 py-5 border-b border-[#edf2f4]">
                  <p className="text-xs text-gray-400 mb-4 font-medium uppercase tracking-wide">Delivery Progress</p>
                  <div className="relative flex items-start justify-between">
                    <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#e5e5e5] z-0" />
                    <div
                      className="absolute top-4 left-0 h-0.5 bg-[#da1a32] z-0 transition-all"
                      style={{ width: `${currentIdx <= 0 ? 0 : (currentIdx / (STEPS.length - 1)) * 100}%` }}
                    />
                    {STEPS.map((step, i) => {
                      const done = i <= currentIdx;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                              done ? 'bg-[#da1a32] border-[#da1a32] shadow-sm' : 'bg-white border-[#e5e5e5]'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${done ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <div className={`text-xs mt-2 text-center font-medium leading-tight max-w-[60px] ${done ? 'text-[#000000]' : 'text-gray-400'}`}>
                            {step.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="px-6 py-4 bg-gradient-to-r from-[#edf2f4] to-white border-b border-[#edf2f4]">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-[#da1a32]" fill="#da1a32" />
                  <p className="text-sm text-[#000000]">
                    <span className="font-bold">{card.quantity} units</span> allocated to{' '}
                    <span className="font-bold">{card.receiverName}</span> for{' '}
                    <span className="text-gray-500">{card.needTitle}</span>
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-[#edf2f4]">
                <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${statusMessage.className}`}>
                  <StatusMessageIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{statusMessage.text}</span>
                </div>
              </div>

              {card.proof && ['delivered', 'proof_uploaded', 'confirmed'].includes(card.status) && (
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 text-[#da1a32]" />
                    <h4 className="font-bold text-[#000000]">Proof of Delivery</h4>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full border ${
                        card.proof.confirmed
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : 'bg-[#edf2f4] text-gray-600 border-[#e5e5e5]'
                      }`}
                    >
                      {card.proof.confirmed ? 'Verified' : 'Awaiting confirmation'}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-48 h-32 rounded-xl overflow-hidden border-2 border-[#e5e5e5] flex-shrink-0">
                      <img src={card.proof.imageUrl} alt="Proof of delivery" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Timestamp:</span>
                        <span className="font-medium text-[#000000]">{card.proof.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Location:</span>
                        <span className="font-medium text-[#000000]">{card.proof.location}</span>
                      </div>
                      {card.proof.confirmed && (
                        <div className="flex items-center gap-2 text-sm">
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 font-medium">Receiver confirmed receipt</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
