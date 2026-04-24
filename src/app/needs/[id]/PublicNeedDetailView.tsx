'use client';

import Link from 'next/link';
import { Building2, MapPin, Phone, Mail, Package, AlertCircle, Heart } from 'lucide-react';
import type { PublicNeedRow, PublicOrganizationDetail } from '@/lib/publicNeeds';

function urgencyBadgeClasses(urgency: PublicNeedRow['urgency']) {
  if (urgency === 'high') {
    return {
      wrap: 'border-red-100 bg-red-50',
      icon: 'text-red-600',
      label: 'bg-red-100 text-red-600 border-red-200',
      qty: 'text-red-600',
      text: 'High Priority',
    };
  }
  if (urgency === 'low') {
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

function locationLine(org: PublicOrganizationDetail['organization']) {
  return org.location_name?.trim() || org.address?.trim() || 'Location on file';
}

export function PublicNeedDetailView({ data }: { data: PublicOrganizationDetail }) {
  const { organization: org, needs } = data;
  const mapPoint =
    org.latitude != null && org.longitude != null
      ? { lat: Number(org.latitude), lng: Number(org.longitude) }
      : null;
  const mapQuery = encodeURIComponent(locationLine(org));
  const mapSrc = mapPoint
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapPoint.lng - 0.03},${mapPoint.lat - 0.02},${mapPoint.lng + 0.03},${mapPoint.lat + 0.02}&layer=mapnik&marker=${mapPoint.lat},${mapPoint.lng}`
    : `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href="/needs">
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
                <h1 className="text-3xl mb-2 text-[#000000] font-bold">{org.name}</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {locationLine(org)}
                </div>
              </div>
            </div>

            <div className="bg-[#edf2f4] border-2 border-[#e5e5e5] rounded-xl p-4 mb-6">
              <h3 className="font-medium mb-2 text-[#000000]">About Organization</h3>
              <p className="text-sm text-gray-600">
                {org.description?.trim() || `${org.name} is a verified partner organization on DonateAI.`}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <Phone className="w-5 h-5 text-[#da1a32]" />
                <div>
                  <div className="text-sm text-gray-600">Contact Phone</div>
                  <div className="font-medium text-[#000000]">{org.contact_phone || 'On request after login'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <Mail className="w-5 h-5 text-[#da1a32]" />
                <div>
                  <div className="text-sm text-gray-600">Contact Email</div>
                  <div className="font-medium text-[#000000]">{org.contact_email}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-4 text-[#000000] font-bold">Current Needs</h2>
            <div className="space-y-4">
              {needs.map((need) => {
                const rowUrgency = need.urgency;
                const c = urgencyBadgeClasses(rowUrgency);
                const remaining = Math.max(0, need.quantity_requested - need.quantity_fulfilled);
                return (
                  <div key={need.id} className={`p-4 border-2 rounded-xl ${c.wrap}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <Package className={`w-6 h-6 mt-1 ${c.icon}`} />
                        <div>
                          <h3 className="font-medium text-lg text-[#000000]">{need.title}</h3>
                          <p className="text-sm text-gray-600">{need.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Category: {need.category}</p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 font-medium ${c.label}`}
                      >
                        {rowUrgency === 'high' ? <AlertCircle className="w-3 h-3" /> : null}
                        {c.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`text-2xl font-bold ${c.qty}`}>{remaining} units still needed</div>
                      <div className="text-sm text-gray-600">
                        {need.quantity_fulfilled}/{need.quantity_requested} matched
                      </div>
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
                title={`Map showing ${org.name}`}
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
            <p className="text-white opacity-80 text-sm mb-6">
              Sign in to donate or sponsor delivery. Your support helps verified organizations meet these needs.
            </p>
            <Link href="/login">
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
