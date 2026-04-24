'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

export type UrgentNeedCard = {
  id: string;
  organization: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  image: string;
  images?: string[];
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
          {needs.length === 0 ? (
            <div className="md:col-span-3 rounded-xl border border-[#e5e5e5] bg-white px-6 py-10 text-center text-gray-600">
              No urgent needs available right now.
            </div>
          ) : null}
          {needs.map((need) => (
            <Link key={need.id} href={`/needs/${need.id}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                <UrgentImageCarousel need={need} />
                <div className="relative">
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

function UrgentImageCarousel({ need }: { need: UrgentNeedCard }) {
  const images = need.images && need.images.length > 0 ? need.images : [need.image];
  const [index, setIndex] = useState(0);
  const total = images.length;
  const current = images[index] || need.image;

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i - 1 + total) % total);
  };
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + 1) % total);
  };

  return (
    <div className="relative h-48">
      <img src={current} alt={need.need} className="w-full h-full object-cover" />
      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 right-2 rounded bg-black/55 px-2 py-0.5 text-[11px] text-white">
            {index + 1}/{total}
          </div>
        </>
      ) : null}
    </div>
  );
}
