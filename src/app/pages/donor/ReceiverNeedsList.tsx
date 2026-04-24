'use client';

import Link from 'next/link';
import { Building2, MapPin, Package, AlertCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Package, AlertCircle, Zap, ImageIcon } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDonorContext } from '../../context/DonorContext';
import type { PublicBrowseReceiver } from '@/lib/publicNeeds';
import { DEFAULT_NEED_IMAGE, getContextualDefaultNeedImage } from '@/lib/media';

const urgencyColors: Record<string, string> = {
  high: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  low: 'bg-green-50 text-green-600 border-green-100',
};

function getVerificationBadge(status: NeedOrganization['verification_status']) {
  if (status === 'approved') {
    return {
      label: 'Approved',
      className: 'bg-green-50 text-green-700 border-green-100',
    };
  }

function ImageCarousel({
  images,
  altPrefix,
}: {
  images: string[];
  altPrefix: string;
}) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const current = images[index] || DEFAULT_NEED_IMAGE;

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
    <div className="relative mb-4 overflow-hidden rounded-xl border border-[#e5e5e5]">
      <img src={current} alt={`${altPrefix} ${index + 1}`} className="h-44 w-full object-cover" />
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

export function ReceiverNeedsList({
  detailBasePath = '/donor/needs',
  showBackButton = false,
  backHref = '/donor',
  liveReceivers = [],
}: ReceiverNeedsListProps) {
  const pathname = usePathname();
  const { emergencyMode } = useDonorContext();
  const [needs, setNeeds] = useState<NeedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    const loadNeeds = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('needs')
          .select('id, title, description, category, image_url, quantity_requested, quantity_fulfilled, urgency, organizations(id, name, address, logo_url, verification_status, is_emergency, emergency_reason)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNeeds((data ?? []) as NeedRecord[]);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load receiver needs.');
      } finally {
        setLoading(false);
      }
    };

    void loadNeeds();
  }, []);

  const categories = useMemo(() => {
    return [...new Set(needs.map((need) => need.category).filter(Boolean))];
  }, [needs]);

  const filteredNeeds = useMemo(() => {
    const next = needs.filter((need) => {
      const matchesCategory = categoryFilter === 'all' || need.category === categoryFilter;
      const matchesUrgency = urgencyFilter === 'all' || need.urgency === urgencyFilter;
      return matchesCategory && matchesUrgency;
    });

    if (!emergencyMode) return next;

  const mergedReceivers = useMemo(() => liveReceivers, [liveReceivers]);

      const urgencyRank: Record<NeedRecord['urgency'], number> = { high: 3, medium: 2, low: 1 };
      return urgencyRank[b.urgency] - urgencyRank[a.urgency];
    });
  }, [categoryFilter, emergencyMode, needs, urgencyFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Organizations in Need</h1>
        <p className="text-gray-600">Browse live receiver needs from Supabase</p>
      </div>

      {emergencyMode && (
        <div className="mb-6 bg-[#da1a32] text-white px-5 py-4 rounded-2xl flex items-start gap-3 shadow-lg">
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Emergency Mode Active - Urgent requests are prioritised</p>
            <p className="text-xs text-white opacity-80 mt-0.5">Emergency-tagged organizations appear at the top based on current receiver data.</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] bg-white text-[#000000]"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
          className="px-4 py-2 border-2 border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#da1a32] bg-white text-[#000000]"
        >
          <option value="all">All Urgency Levels</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {loading && (
        <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4] px-4 py-8 text-center text-sm text-gray-600">
          Loading receiver needs...
        </div>
      )}

      {!loading && filteredNeeds.length === 0 && (
        <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4] px-4 py-8 text-center text-sm text-gray-600">
          No active receiver needs matched your filters.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {sortedReceivers.length === 0 ? (
          <div className="lg:col-span-2 rounded-xl border border-[#e5e5e5] bg-white px-6 py-10 text-center text-gray-600">
            No active organizations are available yet.
          </div>
        ) : null}
        {sortedReceivers.map((receiver) => (
          <Link key={receiver.id} href={`${resolvedDetailBasePath}/${receiver.id}`}>
            {(() => {
              const receiverImages = Array.from(
                new Set(
                  receiver.items.flatMap((item) =>
                    item.imageUrls && item.imageUrls.length > 0
                      ? item.imageUrls
                      : item.imageUrl
                        ? [item.imageUrl]
                        : []
                  )
                )
              );
              const cardMainImage =
                receiverImages[0] ||
                getContextualDefaultNeedImage(receiver.items.map((item) => item.item).join(' ')) ||
                DEFAULT_NEED_IMAGE;
              return (
            <div
              className={`bg-white rounded-2xl p-6 border-2 shadow-sm hover:shadow-md hover:border-[#da1a32] transition-all cursor-pointer ${
                emergencyMode && receiver.emergency ? 'border-[#da1a32] ring-2 ring-red-100' : 'border-[#e5e5e5]'
              }`}
            >
              <ImageCarousel
                images={receiverImages.length > 0 ? receiverImages : [cardMainImage]}
                altPrefix={`${receiver.name} need image`}
              />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  {receiver.organizationLogoUrl ? (
                    <img
                      src={receiver.organizationLogoUrl}
                      alt={`${receiver.name} logo`}
                      className="h-12 w-12 rounded-xl border border-[#e5e5e5] object-cover flex-shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg text-[#000000] font-bold">{receiver.name}</h3>
                      {emergencyMode && receiver.emergency && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-[#da1a32] text-white text-xs rounded-full font-medium">
                          <Zap className="w-3 h-3" /> Emergency
                        </span>
                        {emergencyMode && isEmergency && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#da1a32] text-white text-xs rounded-full font-medium">
                            <Zap className="w-3 h-3" /> Emergency
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {organization.name} - {getLocationLabel(organization.address)}
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap ${urgencyColors[need.urgency]}`}>
                      {need.urgency === 'high' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                      {need.urgency.charAt(0).toUpperCase() + need.urgency.slice(1)}
                    </span>
                  </div>

                  {emergencyMode && isEmergency && organization.emergency_reason && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-[#da1a32] font-medium">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {organization.emergency_reason}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-[#000000]" />
                        <div>
                          <div className="font-medium text-[#000000]">{need.category}</div>
                          <div className="text-sm text-gray-600">{need.quantity_requested} units requested</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-[#000000]">{quantityRemaining} remaining</div>
                        <div className="text-xs text-gray-500">{need.quantity_fulfilled} fulfilled</div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm text-gray-600">
                    {need.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-[#e5e5e5]">
                    <div className="text-[#da1a32] text-sm hover:text-[#b01528] font-medium">
                      View Details ->
                    </div>
                  </div>
                </div>
              </div>
            </div>
              );
            })()}
          </Link>
        ))}
      </div>
    </div>
  );
}
