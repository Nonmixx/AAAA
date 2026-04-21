import Link from 'next/link';
import { Building2, MapPin, Package, AlertCircle, Zap } from 'lucide-react';
import { useDonorContext } from '../../context/DonorContext';

const mockReceivers = [
  {
    id: '1',
    name: 'Hope Orphanage',
    location: 'Kuala Lumpur',
    distance: '2.5 km',
    emergency: true,
    emergencyReason: 'Flash flood displaced 80 children',
    items: [
      { item: 'Food Packs', quantity: 100, urgency: 'high' },
      { item: 'School Supplies', quantity: 50, urgency: 'medium' },
    ],
  },
  {
    id: '2',
    name: 'Care Foundation',
    location: 'Petaling Jaya',
    distance: '5.1 km',
    emergency: true,
    emergencyReason: 'Critical shortage after donations halted',
    items: [
      { item: 'Blankets', quantity: 75, urgency: 'high' },
      { item: 'Medical Supplies', quantity: 30, urgency: 'high' },
    ],
  },
  {
    id: '3',
    name: 'Sunshine Children Home',
    location: 'Subang Jaya',
    distance: '8.3 km',
    emergency: false,
    emergencyReason: '',
    items: [
      { item: 'Clothing', quantity: 120, urgency: 'medium' },
      { item: 'Toys', quantity: 60, urgency: 'low' },
    ],
  },
  {
    id: '4',
    name: 'Elderly Care Center',
    location: 'Shah Alam',
    distance: '12.4 km',
    emergency: false,
    emergencyReason: '',
    items: [
      { item: 'Wheelchairs', quantity: 10, urgency: 'high' },
      { item: 'Medicine', quantity: 50, urgency: 'medium' },
    ],
  },
];

const urgencyColors: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  low: 'bg-green-50 text-green-600 border-green-100',
};

export function ReceiverNeedsList() {
  const { emergencyMode } = useDonorContext();

  const sortedReceivers = emergencyMode
    ? [...mockReceivers].sort((a, b) => (b.emergency ? 1 : 0) - (a.emergency ? 1 : 0))
    : mockReceivers;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Organizations in Need</h1>
        <p className="text-gray-600">Browse and support organizations that need your help</p>
      </div>

      {/* Emergency Mode Banner */}
      {emergencyMode && (
        <div className="mb-6 bg-[#da1a32] text-white px-5 py-4 rounded-2xl flex items-start gap-3 shadow-lg">
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Emergency Mode Active — Urgent requests are prioritised</p>
            <p className="text-xs text-white opacity-80 mt-0.5">Emergency-tagged organisations appear at the top. AI allocation will prioritise them first.</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select className="px-4 py-2 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] bg-white text-[#000000]">
          <option>All Categories</option>
          <option>Food &amp; Supplies</option>
          <option>Medical</option>
          <option>Clothing</option>
          <option>Education</option>
        </select>
        <select className="px-4 py-2 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] bg-white text-[#000000]">
          <option>All Urgency Levels</option>
          <option>High Priority</option>
          <option>Medium Priority</option>
          <option>Low Priority</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {sortedReceivers.map((receiver) => (
          <Link key={receiver.id} href={`/donor/needs/${receiver.id}`}>
            <div
              className={`bg-white rounded-2xl p-6 border-2 shadow-sm hover:shadow-md hover:border-[#da1a32] transition-all cursor-pointer ${
                emergencyMode && receiver.emergency ? 'border-[#da1a32] ring-2 ring-red-100' : 'border-[#e5e5e5]'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg text-[#000000] font-bold">{receiver.name}</h3>
                      {emergencyMode && receiver.emergency && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-[#da1a32] text-white text-xs rounded-full font-medium">
                          <Zap className="w-3 h-3" /> Emergency
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {receiver.location} • {receiver.distance}
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency reason banner */}
              {emergencyMode && receiver.emergency && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-[#da1a32] font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {receiver.emergencyReason}
                </div>
              )}

              <div className="space-y-3">
                {receiver.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-[#000000]" />
                      <div>
                        <div className="font-medium text-[#000000]">{item.item}</div>
                        <div className="text-sm text-gray-600">{item.quantity} units needed</div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full border ${urgencyColors[item.urgency]}`}>
                      {item.urgency === 'high' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                      {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[#e5e5e5]">
                <div className="text-[#da1a32] text-sm hover:text-[#b01528] font-medium">
                  View Details →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
