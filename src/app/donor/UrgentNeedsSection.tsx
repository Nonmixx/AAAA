'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

export type UrgentNeedCard = {
  id: string;
  organization: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  image: string;
  need: string;
  quantity: number;
  matched: number;
  urgency: 'high' | 'medium' | 'low';
};

export function UrgentNeedsSection({ needs }: { needs: UrgentNeedCard[] }) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => setUserLocation(null),
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

  const distanceLabel = (need: UrgentNeedCard) => {
    if (!userLocation || need.latitude == null || need.longitude == null) return 'Nearby';
    const km = distanceKm(userLocation.latitude, userLocation.longitude, need.latitude, need.longitude);
    return `${km.toFixed(1)} km`;
  };

  return (
    <section className="py-24 bg-[#edf2f4]/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-4xl font-bold text-[#000000] mb-2">Urgent Needs</h2>
            <p className="text-xl text-gray-600">High-priority requests that need immediate support</p>
          </div>
          <Link href="/needs">
            <button className="px-6 py-3 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] hover:scale-[1.02] transition-all duration-200 font-medium shadow-lg">
              View All
            </button>
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {needs.map((need) => (
            <Link key={need.id} href={`/needs/${need.id}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                <div className="relative h-48">
                  <img src={need.image} alt={need.need} className="w-full h-full object-cover" />
                  <div
                    className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${
                      need.urgency === 'high' ? 'bg-[#da1a32] text-white' : 'bg-yellow-500 text-white'
                    }`}
                  >
                    {need.urgency === 'high' ? '🔴 Urgent' : '⚠️ High Priority'}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#000000] mb-2">{need.organization}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {need.location} • {distanceLabel(need)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Need: {need.need}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
