'use client';

import Link from 'next/link';
import { Building2, MapPin, Package, AlertCircle, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDonorContext } from '../../context/DonorContext';
import type { PublicBrowseReceiver } from '@/lib/publicNeeds';

const mockReceivers = [
  {
    id: '1',
    name: 'Hope Orphanage',
    location: 'Kuala Lumpur',
    latitude: 3.139,
    longitude: 101.6869,
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
    latitude: 3.1073,
    longitude: 101.6067,
    emergency: true,
    emergencyReason: 'Critical shortage after donations halted',
    items: [
      { item: 'Blankets', quantity: 75, urgency: 'high' },
      { item: 'Medical Supplies', quantity: 30, urgency: 'high' },
    ],
  },
  {
    id: '3',
    name: 'Pages Library',
    location: 'George Town',
    latitude: 5.4164,
    longitude: 100.3327,
    emergency: false,
    emergencyReason: '',
    items: [
      { item: 'Bookshelves', quantity: 8, urgency: 'medium' },
      { item: 'Floor Mats', quantity: 20, urgency: 'low' },
    ],
  },
  {
    id: '4',
    name: 'Urban Shelter',
    location: 'Johor Bahru',
    latitude: 1.4927,
    longitude: 103.7414,
    emergency: false,
    emergencyReason: '',
    items: [
      { item: 'Bottled Water', quantity: 500, urgency: 'high' },
      { item: 'Baby Formula', quantity: 120, urgency: 'medium' },
    ],
  },
];

const urgencyColors: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  low: 'bg-green-50 text-green-600 border-green-100',
};

type ReceiverNeedsListProps = {
  detailBasePath?: string;
  showBackButton?: boolean;
  backHref?: string;
  /** Live rows from Supabase; merged ahead of demo data when present. */
  liveReceivers?: PublicBrowseReceiver[];
};

export function ReceiverNeedsList({
  detailBasePath = '/donor/needs',
  showBackButton = false,
  backHref = '/donor',
  liveReceivers = [],
}: ReceiverNeedsListProps) {
  const pathname = usePathname();
  const { emergencyMode } = useDonorContext();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return earthKm * c;
  };

  const distanceLabel = (receiver: { latitude?: number | null; longitude?: number | null }) => {
    if (!userLocation || receiver.latitude == null || receiver.longitude == null) return 'Nearby';
    const km = distanceKm(userLocation.latitude, userLocation.longitude, receiver.latitude, receiver.longitude);
    return `${km.toFixed(1)} km`;
  };

  // Guard against merge regressions: keep public /needs flow on public routes.
  const isPublicNeedsRoute = pathname?.startsWith('/needs');
  const resolvedDetailBasePath = isPublicNeedsRoute ? '/needs' : detailBasePath;
  const resolvedShowBackButton = isPublicNeedsRoute ? true : showBackButton;
  const resolvedBackHref = isPublicNeedsRoute ? '/donor' : backHref;

  const mergedReceivers = useMemo(() => {
    const demoIds = new Set(mockReceivers.map((r) => r.id));
    const uniqueLive = liveReceivers.filter((r) => !demoIds.has(r.id));
    return [...uniqueLive, ...mockReceivers];
  }, [liveReceivers]);

  const sortedReceivers = emergencyMode
    ? [...mergedReceivers].sort((a, b) => (b.emergency ? 1 : 0) - (a.emergency ? 1 : 0))
    : mergedReceivers;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {resolvedShowBackButton && (
        <div className="mb-4">
          <Link href={resolvedBackHref}>
            <button className="px-6 py-3 bg-white text-[#000000] border border-[#dbe2e8] rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm">
              Back
            </button>
          </Link>
        </div>
      )}

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
          <Link key={receiver.id} href={`${resolvedDetailBasePath}/${receiver.id}`}>
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
                      {receiver.location} • {distanceLabel(receiver)}
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
                <div className="text-[#da1a32] text-sm hover:text-[#b01528] font-medium text-right">
                  View Details
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
