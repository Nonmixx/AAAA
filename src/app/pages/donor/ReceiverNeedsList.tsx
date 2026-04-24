import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Package, AlertCircle, Zap, ImageIcon } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDonorContext } from '../../context/DonorContext';
import {
  getNeedDisplayImage,
  getNeedMediaSource,
  getOrganizationInitials,
  type NeedMediaSource,
} from '@/lib/media';

type NeedOrganization = {
  id?: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | null;
  is_emergency?: boolean | null;
  emergency_reason?: string | null;
};

type NeedRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  quantity_requested: number;
  quantity_fulfilled: number;
  urgency: 'low' | 'medium' | 'high';
  organizations: NeedOrganization | NeedOrganization[] | null;
};

function getOrganizationRecord(organization: NeedRecord['organizations']) {
  if (Array.isArray(organization)) return organization[0] ?? null;
  return organization;
}

function getLocationLabel(address?: string | null) {
  if (!address) return 'Location pending';
  return address.split(',')[0]?.trim() || address;
}

function getMediaBadgeLabel(source: NeedMediaSource) {
  if (source === 'need-image') return 'Need photo';
  if (source === 'organization-logo') return 'Organization logo';
  return 'Placeholder';
}

function NeedVisual({
  imageUrl,
  source,
  organizationName,
  category,
}: {
  imageUrl: string | null;
  source: NeedMediaSource;
  organizationName: string;
  category: string;
}) {
  if (imageUrl) {
    return (
      <>
        <img src={imageUrl} alt={organizationName} className="h-44 w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
      </>
    );
  }

  return (
    <div className="flex h-44 w-full items-center justify-center bg-[linear-gradient(135deg,#111111_0%,#2a2a2a_45%,#da1a32_100%)] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-bold">
          {getOrganizationInitials(organizationName)}
        </div>
        <div className="mt-4 text-sm font-medium uppercase tracking-[0.24em] text-white/70">{category}</div>
        <div className="mt-2 text-lg font-semibold">{organizationName}</div>
      </div>
    </div>
  );
}

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

  if (status === 'rejected') {
    return {
      label: 'Rejected',
      className: 'bg-gray-50 text-gray-600 border-gray-200',
    };
  }

  return {
    label: 'Pending Verification',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  };
}

export function ReceiverNeedsList() {
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

    return [...next].sort((a, b) => {
      const orgA = getOrganizationRecord(a.organizations);
      const orgB = getOrganizationRecord(b.organizations);
      const emergencyA = orgA?.is_emergency ? 1 : 0;
      const emergencyB = orgB?.is_emergency ? 1 : 0;
      if (emergencyB !== emergencyA) return emergencyB - emergencyA;

      const urgencyRank: Record<NeedRecord['urgency'], number> = { high: 3, medium: 2, low: 1 };
      return urgencyRank[b.urgency] - urgencyRank[a.urgency];
    });
  }, [categoryFilter, emergencyMode, needs, urgencyFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Organizations in Need</h1>
        <p className="text-gray-600">Browse live receiver needs from approved organizations in Supabase</p>
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
        {filteredNeeds.map((need) => {
          const organization = getOrganizationRecord(need.organizations);
          if (!organization) return null;

          const mediaSource = getNeedMediaSource(need.image_url, organization.logo_url);
          const imageUrl = getNeedDisplayImage(need.image_url, organization.logo_url);
          const quantityRemaining = Math.max(0, need.quantity_requested - need.quantity_fulfilled);
          const isEmergency = !!organization.is_emergency;
          const verificationBadge = getVerificationBadge(organization.verification_status);

          return (
            <Link key={need.id} href={`/donor/needs/${need.id}`}>
              <div
                className={`bg-white rounded-2xl overflow-hidden border-2 shadow-sm hover:shadow-md hover:border-[#da1a32] transition-all cursor-pointer ${
                  emergencyMode && isEmergency ? 'border-[#da1a32] ring-2 ring-red-100' : 'border-[#e5e5e5]'
                }`}
              >
                <div className="relative">
                  <NeedVisual
                    imageUrl={imageUrl}
                    source={mediaSource}
                    organizationName={organization.name}
                    category={need.category}
                  />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#000000] shadow-sm">
                    {mediaSource === 'organization-logo' ? <Building2 className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                    {getMediaBadgeLabel(mediaSource)}
                  </div>
                  {need.urgency === 'high' && (
                    <div className="absolute right-4 top-4 rounded-full bg-[#da1a32] px-3 py-1 text-sm font-medium text-white">
                      URGENT
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-lg text-[#000000] font-bold">{need.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${verificationBadge.className}`}>
                          {verificationBadge.label}
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
