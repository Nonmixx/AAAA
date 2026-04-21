import { useState } from 'react';
import { Package, User, MapPin, Truck, Check, X, Clock, Camera, ShieldCheck, AlertCircle } from 'lucide-react';

type DonationStatus = 'pending' | 'accepted' | 'rejected' | 'delivered' | 'confirmed';

interface IncomingDonation {
  id: string;
  item: string;
  quantity: number;
  donorName: string;
  donorLocation: string;
  deliveryMethod: string;
  estimatedDelivery: string;
  status: DonationStatus;
  aiMatch: boolean;
  proof?: { imageUrl: string; timestamp: string; location: string };
}

const initialDonations: IncomingDonation[] = [
  {
    id: 'INC-001',
    item: 'Food Packs',
    quantity: 60,
    donorName: 'Sarah Johnson',
    donorLocation: 'Kuala Lumpur',
    deliveryMethod: 'Platform Delivery',
    estimatedDelivery: '2026-04-20',
    status: 'pending',
    aiMatch: true,
  },
  {
    id: 'INC-002',
    item: 'School Supplies',
    quantity: 40,
    donorName: 'Michael Chen',
    donorLocation: 'Petaling Jaya',
    deliveryMethod: 'Self Delivery',
    estimatedDelivery: '2026-04-19',
    status: 'pending',
    aiMatch: true,
  },
  {
    id: 'INC-003',
    item: 'Blankets',
    quantity: 25,
    donorName: 'Lisa Wong',
    donorLocation: 'Subang Jaya',
    deliveryMethod: 'Platform Delivery',
    estimatedDelivery: '2026-04-21',
    status: 'delivered',
    aiMatch: false,
    proof: {
      imageUrl: 'https://images.unsplash.com/photo-1618069416986-eb1677ba3cc9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      timestamp: '20 Apr 2026, 11:14 AM',
      location: 'Hope Orphanage, Kuala Lumpur',
    },
  },
  {
    id: 'INC-004',
    item: 'Medical Supplies',
    quantity: 15,
    donorName: 'Ahmad Ibrahim',
    donorLocation: 'Shah Alam',
    deliveryMethod: 'Platform Delivery',
    estimatedDelivery: '2026-04-18',
    status: 'rejected',
    aiMatch: false,
  },
];

type Filter = 'all' | 'pending' | 'accepted' | 'rejected' | 'delivered' | 'confirmed';

const STATUS_BADGE: Record<DonationStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-50 text-yellow-600 border-yellow-100', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-50 text-green-600 border-green-100', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: X },
  delivered: { label: 'Delivered', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Package },
  confirmed: { label: 'Confirmed Received', color: 'bg-green-50 text-green-700 border-green-100', icon: ShieldCheck },
};

export function IncomingDonations() {
  const [donations, setDonations] = useState<IncomingDonation[]>(initialDonations);
  const [filter, setFilter] = useState<Filter>('all');

  const updateStatus = (id: string, status: DonationStatus) => {
    setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const filtered = filter === 'all' ? donations : donations.filter((d) => d.status === filter);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All Donations' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Incoming Donations</h1>
        <p className="text-gray-600">Review and manage donation offers from donors</p>
      </div>

      {/* Filters */}
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
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">No donations in this category.</div>
        )}

        {filtered.map((donation) => {
          const badge = STATUS_BADGE[donation.status];
          const BadgeIcon = badge.icon;

          return (
            <div
              key={donation.id}
              className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${
                donation.status === 'pending'
                  ? 'border-[#da1a32]'
                  : donation.status === 'confirmed'
                  ? 'border-green-200'
                  : donation.status === 'delivered'
                  ? 'border-blue-100'
                  : 'border-[#e5e5e5]'
              }`}
            >
              {/* Card Header */}
              <div className="p-6 border-b border-[#edf2f4]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl text-[#000000] font-bold">{donation.item}</h3>
                        <span className="text-sm text-gray-400">#{donation.id}</span>
                        {donation.aiMatch && (
                          <span className="px-2 py-0.5 bg-[#edf2f4] text-[#000000] text-xs rounded-full border border-[#e5e5e5] font-medium">
                            AI Matched
                          </span>
                        )}
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

              {/* Info Grid */}
              <div className="px-6 py-4 border-b border-[#edf2f4]">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-[#da1a32]" />
                      <div className="text-xs text-gray-600">Donor</div>
                    </div>
                    <div className="font-medium text-[#000000] text-sm">{donation.donorName}</div>
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-[#da1a32]" />
                      <div className="text-xs text-gray-600">Location</div>
                    </div>
                    <div className="font-medium text-[#000000] text-sm">{donation.donorLocation}</div>
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-[#da1a32]" />
                      <div className="text-xs text-gray-600">Delivery</div>
                    </div>
                    <div className="font-medium text-[#000000] text-sm">{donation.deliveryMethod}</div>
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-[#da1a32]" />
                      <div className="text-xs text-gray-600">Expected</div>
                    </div>
                    <div className="font-medium text-[#000000] text-sm">
                      {new Date(donation.estimatedDelivery).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Proof of Delivery (for delivered / confirmed) */}
              {donation.proof && (donation.status === 'delivered' || donation.status === 'confirmed') && (
                <div className="px-6 py-5 border-b border-[#edf2f4]">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 text-[#da1a32]" />
                    <h4 className="font-bold text-[#000000]">Proof of Delivery</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${donation.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {donation.status === 'confirmed' ? 'Confirmed' : 'Received'}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-44 h-28 rounded-xl overflow-hidden border-2 border-[#e5e5e5] flex-shrink-0">
                      <img src={donation.proof.imageUrl} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Timestamp:</span>
                        <span className="font-medium text-[#000000]">{donation.proof.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Location:</span>
                        <span className="font-medium text-[#000000]">{donation.proof.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Area */}
              <div className="px-6 py-4">
                {/* Pending → Accept / Reject */}
                {donation.status === 'pending' && (
                  <div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => updateStatus(donation.id, 'accepted')}
                        className="flex-1 bg-[#da1a32] text-white py-3 rounded-xl hover:bg-[#b01528] transition-all flex items-center justify-center gap-2 shadow-lg font-medium"
                      >
                        <Check className="w-5 h-5" />
                        Accept Donation
                      </button>
                      <button
                        onClick={() => updateStatus(donation.id, 'rejected')}
                        className="flex-1 bg-white border-2 border-[#e5e5e5] text-[#000000] py-3 rounded-xl hover:bg-[#edf2f4] transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <X className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      If rejected, the system will automatically reallocate resources to another organisation
                    </p>
                  </div>
                )}

                {/* Accepted */}
                {donation.status === 'accepted' && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-2 text-sm text-green-700">
                    <Check className="w-4 h-4" />
                    <span>
                      You have accepted this donation. Delivery is scheduled for{' '}
                      {new Date(donation.estimatedDelivery).toLocaleDateString('en-GB')}.
                    </span>
                  </div>
                )}

                {/* Delivered → Confirm Received */}
                {donation.status === 'delivered' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
                      <Package className="w-4 h-4" />
                      <span>Your donation has arrived! Please confirm receipt below.</span>
                    </div>
                    <button
                      onClick={() => updateStatus(donation.id, 'confirmed')}
                      className="w-full bg-[#000000] text-white py-3 rounded-xl hover:bg-[#da1a32] transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Confirm Received
                    </button>
                  </div>
                )}

                {/* Confirmed */}
                {donation.status === 'confirmed' && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-2 text-sm text-green-700">
                    <ShieldCheck className="w-4 h-4" />
                    <span>You have confirmed receipt of this donation. Thank you!</span>
                  </div>
                )}

                {/* Rejected */}
                {donation.status === 'rejected' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#da1a32]" />
                      <span>
                        This donation was rejected.{' '}
                        <strong className="text-[#000000]">System will reallocate resources</strong> to another
                        organisation automatically.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
