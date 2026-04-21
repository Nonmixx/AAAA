import { Package, MapPin, CheckCircle2, Truck, Clock, Heart, Users, Camera, ShieldCheck, AlertCircle } from 'lucide-react';

type TrackStatus = 'allocated' | 'scheduled' | 'in-transit' | 'delivered' | 'proof-uploaded' | 'confirmed';

const STEPS: { key: TrackStatus; label: string; icon: React.ElementType }[] = [
  { key: 'allocated', label: 'Allocated', icon: AlertCircle },
  { key: 'scheduled', label: 'Scheduled', icon: Clock },
  { key: 'in-transit', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'proof-uploaded', label: 'Proof Uploaded', icon: Camera },
  { key: 'confirmed', label: 'Confirmed', icon: ShieldCheck },
];

const stepIndex = (s: TrackStatus) => STEPS.findIndex((x) => x.key === s);

const mockDonations: {
  id: string;
  item: string;
  quantity: number;
  receivers: string[];
  deliveryMethod: string;
  route: string;
  status: TrackStatus;
  date: string;
  impactLabel: string;
  impactCount: number;
  impactUnit: string;
  proof?: { imageUrl: string; timestamp: string; location: string };
}[] = [
  {
    id: 'DON-001',
    item: 'Food Packs',
    quantity: 100,
    receivers: ['Hope Orphanage (60)', 'Care Foundation (40)'],
    deliveryMethod: 'Platform Delivery',
    route: 'Hope Orphanage → Care Foundation',
    status: 'confirmed',
    date: '2026-04-16',
    impactLabel: 'children fed',
    impactCount: 80,
    impactUnit: 'children',
    proof: {
      imageUrl: 'https://images.unsplash.com/photo-1618069416986-eb1677ba3cc9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      timestamp: '16 Apr 2026, 2:34 PM',
      location: 'Hope Orphanage, Kuala Lumpur',
    },
  },
  {
    id: 'DON-002',
    item: 'Blankets',
    quantity: 50,
    receivers: ['Care Foundation (50)'],
    deliveryMethod: 'Self Delivery',
    route: 'Care Foundation',
    status: 'in-transit',
    date: '2026-04-18',
    impactLabel: 'families kept warm',
    impactCount: 30,
    impactUnit: 'families',
  },
  {
    id: 'DON-003',
    item: 'School Supplies',
    quantity: 75,
    receivers: ['Hope Orphanage (40)', 'Sunshine Children Home (35)'],
    deliveryMethod: 'Platform Delivery',
    route: 'Hope Orphanage → Sunshine Children Home',
    status: 'scheduled',
    date: '2026-04-19',
    impactLabel: 'students supported',
    impactCount: 60,
    impactUnit: 'students',
  },
];

const STATUS_BADGE: Record<TrackStatus, string> = {
  allocated: 'bg-[#edf2f4] text-[#000000] border-[#e5e5e5]',
  scheduled: 'bg-[#edf2f4] text-[#000000] border-[#e5e5e5]',
  'in-transit': 'bg-yellow-50 text-yellow-700 border-yellow-100',
  delivered: 'bg-blue-50 text-blue-700 border-blue-100',
  'proof-uploaded': 'bg-purple-50 text-purple-700 border-purple-100',
  confirmed: 'bg-green-50 text-green-700 border-green-100',
};

export function DonorTracking() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Track Your Donations</h1>
        <p className="text-gray-600">Monitor the full journey of your contributions</p>
      </div>

      {/* Impact Summary Card */}
      <div className="bg-gradient-to-r from-[#000000] to-[#1a1a1a] rounded-2xl p-6 mb-8 text-white flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 bg-[#da1a32] rounded-2xl flex items-center justify-center flex-shrink-0">
            <Heart className="w-7 h-7 text-white" fill="white" />
          </div>
          <div>
            <p className="text-white opacity-60 text-sm mb-0.5">Combined Impact</p>
            <p className="text-2xl font-bold">Your donations helped <span className="text-[#da1a32]">170+ people</span></p>
          </div>
        </div>
        <div className="flex gap-6">
          {[
            { icon: Users, label: 'People Helped', value: '170+' },
            { icon: Package, label: 'Items Donated', value: '225' },
            { icon: CheckCircle2, label: 'Completed', value: '1' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="w-5 h-5 text-[#da1a32] mx-auto mb-1" />
              <div className="text-xl font-bold">{value}</div>
              <div className="text-xs text-white opacity-50">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {mockDonations.map((donation) => {
          const currentIdx = stepIndex(donation.status);
          const BadgeIcon = STEPS[currentIdx].icon;

          return (
            <div key={donation.id} className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm overflow-hidden">
              {/* Card Header */}
              <div className="p-6 border-b border-[#edf2f4]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-xl text-[#000000] font-bold">{donation.item}</h3>
                        <span className="text-sm text-gray-400">#{donation.id}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Quantity: <span className="font-medium text-[#000000]">{donation.quantity} units</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Date: {new Date(donation.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 border font-medium flex-shrink-0 ${STATUS_BADGE[donation.status]}`}>
                    <BadgeIcon className="w-4 h-4" />
                    {STEPS[currentIdx].label}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="px-6 py-4 border-b border-[#edf2f4]">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="text-xs text-gray-500 mb-1">Allocated To</div>
                    {donation.receivers.map((r, i) => (
                      <div key={i} className="font-medium text-sm text-[#000000]">{r}</div>
                    ))}
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="text-xs text-gray-500 mb-1">Delivery Method</div>
                    <div className="font-medium text-[#000000]">{donation.deliveryMethod}</div>
                  </div>
                  <div className="p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="text-xs text-gray-500 mb-1">Route</div>
                    <div className="font-medium text-sm flex items-center gap-1 text-[#000000]">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      {donation.route}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="px-6 py-5 border-b border-[#edf2f4]">
                <p className="text-xs text-gray-400 mb-4 font-medium uppercase tracking-wide">Delivery Progress</p>
                <div className="relative flex items-start justify-between">
                  {/* connecting line */}
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#e5e5e5] z-0" />
                  <div
                    className="absolute top-4 left-0 h-0.5 bg-[#da1a32] z-0 transition-all"
                    style={{ width: `${currentIdx === 0 ? 0 : (currentIdx / (STEPS.length - 1)) * 100}%` }}
                  />
                  {STEPS.map((step, i) => {
                    const done = i <= currentIdx;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                            done
                              ? 'bg-[#da1a32] border-[#da1a32] shadow-sm'
                              : 'bg-white border-[#e5e5e5]'
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

              {/* Impact Visualization */}
              <div className="px-6 py-4 bg-gradient-to-r from-[#edf2f4] to-white border-b border-[#edf2f4]">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-[#da1a32]" fill="#da1a32" />
                  <p className="text-sm text-[#000000]">
                    <span className="font-bold">Your donation helped {donation.impactCount} {donation.impactUnit}</span>{' '}
                    — <span className="text-gray-500">{donation.impactLabel}</span>
                  </p>
                </div>
              </div>

              {/* Status-specific messages */}
              {donation.status === 'in-transit' && (
                <div className="px-6 py-4">
                  <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center gap-2 text-sm text-yellow-700">
                    <Truck className="w-4 h-4" />
                    <span>Estimated delivery: Tomorrow, 2:00 PM</span>
                  </div>
                </div>
              )}

              {donation.status === 'scheduled' && (
                <div className="px-6 py-4">
                  <div className="p-3 bg-[#edf2f4] border border-[#e5e5e5] rounded-xl flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Delivery scheduled for 21 Apr 2026 — awaiting pickup</span>
                  </div>
                </div>
              )}

              {/* Proof of Delivery */}
              {donation.proof && (donation.status === 'proof-uploaded' || donation.status === 'confirmed') && (
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 text-[#da1a32]" />
                    <h4 className="font-bold text-[#000000]">Proof of Delivery</h4>
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">Verified</span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-48 h-32 rounded-xl overflow-hidden border-2 border-[#e5e5e5] flex-shrink-0">
                      <img src={donation.proof.imageUrl} alt="Proof of delivery" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center space-y-2">
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
                      <div className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">Receiver confirmed receipt</span>
                      </div>
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
