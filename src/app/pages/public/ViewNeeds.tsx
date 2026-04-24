'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Heart, Filter, Search, Building2, ImageIcon } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  getNeedDisplayImage,
  getNeedMediaSource,
  getOrganizationInitials,
  type NeedMediaSource,
} from '@/lib/media';

type NeedOrganization = {
  name: string;
  address: string | null;
  logo_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | null;
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

function NeedCardVisual({
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
        <img src={imageUrl} alt={organizationName} className="h-48 w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
      </>
    );
  }

  return (
    <div className="flex h-48 w-full items-center justify-center bg-[linear-gradient(135deg,#111111_0%,#2a2a2a_45%,#da1a32_100%)] px-6 text-white">
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

export function ViewNeeds() {
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [needs, setNeeds] = useState<NeedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadNeeds = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('needs')
          .select('id, title, description, category, image_url, quantity_requested, quantity_fulfilled, urgency, organizations(name, address, logo_url, verification_status)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const visibleNeeds = ((data ?? []) as NeedRecord[]).filter((need) => {
          const organization = getOrganizationRecord(need.organizations);
          return Boolean(organization?.name);
        });

        setNeeds(visibleNeeds);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load public needs.');
      } finally {
        setLoading(false);
      }
    };

    void loadNeeds();
  }, []);

  const filteredNeeds = useMemo(() => {
    return needs.filter((need) => {
      const organization = getOrganizationRecord(need.organizations);
      const haystack = [
        need.title,
        need.description,
        need.category,
        organization?.name ?? '',
        getLocationLabel(organization?.address),
      ].join(' ').toLowerCase();

      const matchesSearch = searchQuery.trim() === '' || haystack.includes(searchQuery.toLowerCase());
      const matchesUrgency = urgencyFilter === 'all' || need.urgency === urgencyFilter;
      return matchesSearch && matchesUrgency;
    });
  }, [needs, searchQuery, urgencyFilter]);

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[#000000] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h1 className="mb-4 text-5xl font-bold">
              Active Needs <span className="text-[#da1a32]">Now</span>
            </h1>
            <p className="mb-8 text-xl text-white/80">
              Verified organizations requesting support, with smart image fallback built in
            </p>
            <div className="flex items-center justify-center gap-4 text-[#edf2f4]">
              <Heart className="h-5 w-5 text-[#da1a32]" />
              <span>Need photo, organization logo, or a clear branded placeholder</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e5e5e5] bg-[#edf2f4] py-6">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for needs, organizations, or locations..."
                className="w-full rounded-lg border border-[#e5e5e5] py-3 pl-10 pr-4 focus:border-[#da1a32] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-4 py-3">
                <Filter className="h-5 w-5" />
                <span className="text-sm font-medium text-[#000000]">Urgency</span>
              </div>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                className="rounded-lg border border-[#e5e5e5] bg-white px-4 py-3 focus:border-[#da1a32] focus:outline-none"
              >
                <option value="all">All levels</option>
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold text-[#000000]">
              {loading ? 'Loading needs...' : `${filteredNeeds.length} Active Needs`}
            </h2>
            <p className="text-gray-600">
              Browse current needs from verified organizations
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {!loading && filteredNeeds.length === 0 && (
            <div className="rounded-2xl border border-[#e5e5e5] bg-[#edf2f4] px-6 py-10 text-center text-gray-600">
              No active needs matched your filters.
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredNeeds.map((need) => {
              const organization = getOrganizationRecord(need.organizations);
              if (!organization) return null;

              const mediaSource = getNeedMediaSource(need.image_url, organization.logo_url);
              const imageUrl = getNeedDisplayImage(need.image_url, organization.logo_url);
              const quantityMatched = need.quantity_fulfilled;
              const progress = need.quantity_requested === 0
                ? 0
                : Math.round((quantityMatched / need.quantity_requested) * 100);

              return (
                <div
                  key={need.id}
                  className="overflow-hidden rounded-lg border-2 border-[#e5e5e5] bg-white transition-all hover:border-[#da1a32] hover:shadow-xl"
                >
                  <div className="relative">
                    <NeedCardVisual
                      imageUrl={imageUrl}
                      source={mediaSource}
                      organizationName={organization.name}
                      category={need.category}
                    />
                    {need.urgency === 'high' && (
                      <div className="absolute right-4 top-4 rounded-full bg-[#da1a32] px-3 py-1 text-sm font-medium text-white">
                        URGENT
                      </div>
                    )}
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#000000] shadow-sm">
                      {mediaSource === 'organization-logo' ? <Building2 className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      {getMediaBadgeLabel(mediaSource)}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold text-[#000000]">{need.title}</h3>
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {organization.name} - {getLocationLabel(organization.address)}
                    </div>

                    <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                      {need.description}
                    </p>
                    <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {need.category}
                    </p>

                    <div className="mb-4">
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium text-[#000000]">
                          {quantityMatched}/{need.quantity_requested}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#e5e5e5]">
                        <div
                          className="h-2 rounded-full bg-[#da1a32] transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {progress}% fulfilled
                      </div>
                    </div>

                    <Link href="/login">
                      <button className="w-full rounded-lg bg-[#000000] py-3 font-medium text-white transition-all hover:bg-[#da1a32]">
                        Donate Now
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#edf2f4] py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-4xl font-bold text-[#000000]">
            Ready to Make an Impact?
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            Sign up today and start helping organizations in need with AI-powered donation matching
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/signup">
              <button className="rounded-lg bg-[#da1a32] px-8 py-4 text-lg font-medium text-white shadow-lg transition-all hover:bg-[#b01528]">
                Create Account
              </button>
            </Link>
            <Link href="/login">
              <button className="rounded-lg border-2 border-[#000000] bg-white px-8 py-4 text-lg font-medium text-[#000000] transition-all hover:bg-[#000000] hover:text-white">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
