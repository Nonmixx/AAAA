'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Building2, MapPin, Phone, Mail, Package, AlertCircle, Heart } from 'lucide-react';
import { getNgoById, type NgoDemandProfile } from '../../lib/ngos-demand-catalog';

/** Needs list page still links with numeric ids for mock rows. */
const LEGACY_LIST_ID_TO_NGO: Record<string, string> = {
  '1': 'ngo_hope_orphanage',
  '2': 'ngo_care_foundation',
  '3': 'ngo_pages_library',
  '4': 'ngo_urban_shelter',
};

const NGO_COORDINATES: Record<string, { lat: number; lng: number }> = {
  ngo_hope_orphanage: { lat: 3.139, lng: 101.6869 },
  ngo_care_foundation: { lat: 3.1073, lng: 101.6067 },
  ngo_green_pantry: { lat: 3.0738, lng: 101.5183 },
  ngo_pages_library: { lat: 3.043, lng: 101.581 },
  ngo_river_clinic: { lat: 3.0449, lng: 101.4456 },
  ngo_urban_shelter: { lat: 3.1357, lng: 101.688 },
};

function resolveNgoFromRouteParam(id: string | string[] | undefined): NgoDemandProfile {
  const raw = (Array.isArray(id) ? id[0] : id) ?? '';
  const decoded = raw ? decodeURIComponent(raw) : '';
  const direct = decoded ? getNgoById(decoded) : undefined;
  if (direct) return direct;
  const legacy = decoded ? LEGACY_LIST_ID_TO_NGO[decoded] : undefined;
  if (legacy) {
    const n = getNgoById(legacy);
    if (n) return n;
  }
  return getNgoById('ngo_hope_orphanage')!;
}

function categoryTitle(cat: string): string {
  const map: Record<string, string> = {
    food: 'Food & meals',
    baby_supplies: 'Baby supplies',
    clothing: 'Clothing',
    school_supplies: 'School supplies',
    hygiene: 'Hygiene kits',
    medical_supplies: 'Medical supplies',
    medical_consumables: 'Medical consumables',
    blankets: 'Blankets & bedding',
    books: 'Books & reading',
    electronics_learning: 'STEM / learning materials',
    elder_care: 'Elder care',
  };
  return map[cat] ?? cat.replace(/_/g, ' ');
}

function categoryDescription(cat: string): string {
  const map: Record<string, string> = {
    food: 'Pantry staples and meal support for households in the service area.',
    baby_supplies: 'Formula, diapers, and infant essentials for enrolled families.',
    clothing: 'Season-appropriate clothing for distribution to clients.',
    school_supplies: 'Stationery, kits, and learning materials for students.',
    hygiene: 'Soap, dental care, and personal hygiene packs.',
    medical_supplies: 'Clinical consumables and first-aid style inventory.',
    medical_consumables: 'Day-to-day medical consumables for care programs.',
    blankets: 'Bedding and warmth items for shelter and outreach.',
    books: 'Reading and curriculum support for library or classroom use.',
    electronics_learning: 'Devices and kits that support digital learning.',
    elder_care: 'Support items and consumables for senior programs.',
  };
  return map[cat] ?? 'Program inventory aligned with this organization’s published demand.';
}

function urgencyBadgeClasses(label: NgoDemandProfile['urgencyLabel']) {
  if (label === 'High') {
    return {
      wrap: 'border-red-100 bg-red-50',
      icon: 'text-red-600',
      label: 'bg-red-100 text-red-600 border-red-200',
      qty: 'text-red-600',
      text: 'High Priority',
    };
  }
  if (label === 'Low') {
    return {
      wrap: 'border-green-100 bg-green-50',
      icon: 'text-green-600',
      label: 'bg-green-100 text-green-600 border-green-200',
      qty: 'text-green-600',
      text: 'Lower Priority',
    };
  }
  return {
    wrap: 'border-yellow-100 bg-yellow-50',
    icon: 'text-yellow-600',
    label: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    qty: 'text-yellow-600',
    text: 'Medium Priority',
  };
}

type ReceiverDetailProps = {
  backHref?: string;
  donateHref?: string;
};

export function ReceiverDetail({ backHref = '/donor/needs', donateHref = '/donor/donate' }: ReceiverDetailProps) {
  const { id } = useParams();

  const ngo = useMemo(() => resolveNgoFromRouteParam(id), [id]);
  const mapQuery = encodeURIComponent(ngo.location.replace(/•.*$/, '').trim());
  const mapPoint = NGO_COORDINATES[ngo.id];
  const mapSrc = mapPoint
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapPoint.lng - 0.03},${mapPoint.lat - 0.02},${mapPoint.lng + 0.03},${mapPoint.lat + 0.02}&layer=mapnik&marker=${mapPoint.lat},${mapPoint.lng}`
    : `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  const demoEmail = `info@${ngo.id.replace(/^ngo_/, '').replace(/_/g, '')}.org`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href={backHref}>
          <button className="px-6 py-3 bg-white text-[#000000] border border-[#dbe2e8] rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm">
            Back
          </button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-[#da1a32] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl mb-2 text-[#000000] font-bold">{ngo.name}</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {ngo.location}
                </div>
              </div>
            </div>

            <div className="bg-[#edf2f4] border-2 border-[#e5e5e5] rounded-xl p-4 mb-6">
              <h3 className="font-medium mb-2 text-[#000000]">About Organization</h3>
              <p className="text-sm text-gray-600">
                {ngo.name} is a partner organization on the DonateAI demand catalog. Current signal from the field:{' '}
                {ngo.currentGap}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <Phone className="w-5 h-5 text-[#da1a32]" />
                <div>
                  <div className="text-sm text-gray-600">Contact Phone</div>
                  <div className="font-medium text-[#000000]">+60 3-1234 5678</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <Mail className="w-5 h-5 text-[#da1a32]" />
                <div>
                  <div className="text-sm text-gray-600">Contact Email</div>
                  <div className="font-medium text-[#000000]">{demoEmail}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-4 text-[#000000] font-bold">Current Needs</h2>
            <div className="space-y-4">
              {ngo.demandCategories.map((cat, index) => {
                const rowUrgency: NgoDemandProfile['urgencyLabel'] =
                  index === 0 ? ngo.urgencyLabel : ngo.urgencyLabel === 'High' ? 'Medium' : 'Low';
                const c = urgencyBadgeClasses(rowUrgency);
                const units = Math.max(10, ngo.needLevel * 15 - index * 5);
                return (
                  <div key={cat} className={`p-4 border-2 rounded-xl ${c.wrap}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <Package className={`w-6 h-6 mt-1 ${c.icon}`} />
                        <div>
                          <h3 className="font-medium text-lg text-[#000000]">{categoryTitle(cat)}</h3>
                          <p className="text-sm text-gray-600">{categoryDescription(cat)}</p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 font-medium ${c.label}`}
                      >
                        {rowUrgency === 'High' ? <AlertCircle className="w-3 h-3" /> : null}
                        {c.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`text-2xl font-bold ${c.qty}`}>{units} units needed</div>
                      <div className="text-sm text-gray-600">From catalog need level {ngo.needLevel}/5</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-4 text-[#000000] font-bold">Location Map</h2>
            <div className="rounded-xl h-64 overflow-hidden border-2 border-[#e5e5e5]">
              <iframe
                title={`Map showing ${ngo.name}`}
                src={mapSrc}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white sticky top-24 shadow-lg">
            <Heart className="w-12 h-12 mb-4" fill="white" />
            <h3 className="text-xl mb-3 font-bold">Support This Organization</h3>
            <p className="text-white opacity-80 text-sm mb-6">{ngo.currentGap}</p>
            <Link href={donateHref}>
              <button className="w-full bg-white text-[#da1a32] py-3 rounded-xl hover:bg-[#edf2f4] transition-all mb-3 shadow-sm font-medium">
                Donate Now
              </button>
            </Link>
            <div className="text-center text-sm text-white opacity-80">Or browse other organizations</div>
          </div>
        </div>
      </div>
    </div>
  );
}
