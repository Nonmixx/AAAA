'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, HeartHandshake, MapPin, Sparkles, Truck, Waves } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type NeedRecord = {
  id: string;
  title: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  quantity_requested: number;
  quantity_fulfilled: number;
  disaster_event_id?: string | null;
  organizations: { name: string; address: string | null } | { name: string; address: string | null }[] | null;
};

type DonationRecord = {
  id: string;
  item_name: string;
  status: string;
  created_at: string;
  donation_allocations:
    | {
        status: string;
        needs:
          | {
              disaster_event_id: string | null;
              organizations: { name: string } | { name: string }[] | null;
            }
          | {
              disaster_event_id: string | null;
              organizations: { name: string } | { name: string }[] | null;
            }[]
          | null;
      }[]
    | null;
};

function getOrganization(record: NeedRecord['organizations']) {
  return Array.isArray(record) ? record[0] ?? null : record;
}

export default function DonorDisasterReliefPage() {
  const [activeEventTitle, setActiveEventTitle] = useState<string | null>(null);
  const [needs, setNeeds] = useState<NeedRecord[]>([]);
  const [recentDisasterDonations, setRecentDisasterDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error('Please log in to view disaster relief.');

        const { data: platformStatus, error: platformError } = await supabase
          .from('platform_status')
          .select('active_disaster_event_id')
          .eq('status_key', 'primary')
          .maybeSingle();

        if (platformError) throw platformError;

        const activeDisasterEventId = platformStatus?.active_disaster_event_id ?? null;
        if (!activeDisasterEventId) {
          setActiveEventTitle(null);
          setNeeds([]);
          setRecentDisasterDonations([]);
          return;
        }

        const [{ data: event }, needsResponse, { data: donationsData, error: donationsError }] =
          await Promise.all([
            supabase.from('disaster_events').select('title').eq('id', activeDisasterEventId).maybeSingle(),
            fetch('/api/donor/needs', { cache: 'no-store' }),
            supabase
              .from('donations')
              .select('id, item_name, status, created_at, donation_allocations(status, needs(disaster_event_id, organizations(name)))')
              .eq('donor_profile_id', user.id)
              .order('created_at', { ascending: false })
              .limit(10),
          ]);

        if (donationsError) throw donationsError;
        const needsJson = (await needsResponse.json()) as { needs?: NeedRecord[]; error?: string };
        if (!needsResponse.ok) {
          throw new Error(needsJson.error || 'Unable to load disaster needs.');
        }

        setActiveEventTitle(event?.title ?? 'Active disaster');
        setNeeds(
          (needsJson.needs ?? [])
            .filter((need) => need.disaster_event_id === activeDisasterEventId)
            .slice(0, 12),
        );

        const filteredDonations = ((donationsData ?? []) as DonationRecord[]).filter((donation) =>
          (donation.donation_allocations ?? []).some((allocation) => {
            const need = Array.isArray(allocation.needs) ? allocation.needs[0] : allocation.needs;
            return need?.disaster_event_id === activeDisasterEventId;
          }),
        );
        setRecentDisasterDonations(filteredDonations);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load disaster relief.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const topNeeds = useMemo(() => needs.slice(0, 6), [needs]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 rounded-3xl bg-[#000000] p-8 text-white">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#da1a32]/20 px-3 py-1 text-xs font-medium text-[#ffcad1]">
              <Waves className="h-4 w-4" />
              Disaster Relief Mode
            </div>
            <h1 className="text-3xl font-bold">{loading ? 'Loading...' : activeEventTitle ?? 'No active disaster event'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              This page prioritizes live disaster needs so donors can respond quickly without digging through the wider marketplace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/donor/donate" className="rounded-xl bg-[#da1a32] px-4 py-2 text-sm font-medium text-white hover:bg-[#b01528]">
              Open AI Donate
            </Link>
            <Link href="/donor/tracking" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              View tracking
            </Link>
          </div>
        </div>
      </div>

      {errorMessage && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Priority Needs</div>
          <div className="mt-2 text-3xl font-bold text-[#000000]">{loading ? '-' : needs.length}</div>
        </div>
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Your Disaster Donations</div>
          <div className="mt-2 text-3xl font-bold text-[#000000]">{loading ? '-' : recentDisasterDonations.length}</div>
        </div>
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Best Next Action</div>
          <div className="mt-2 text-sm font-medium text-[#000000]">Donate to a live shelter need below</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr,0.95fr]">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Top Disaster Needs</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {topNeeds.map((need) => {
              const organization = getOrganization(need.organizations);
              const remaining = Math.max(0, need.quantity_requested - need.quantity_fulfilled);
              return (
                <div key={need.id} className="rounded-xl border border-[#e5e5e5] p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#000000]">{need.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{organization?.name ?? 'Shelter pending'}</div>
                    </div>
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-[#da1a32]">{need.urgency}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {organization?.address ?? 'Location pending'}
                  </div>
                  <div className="mt-3 text-sm text-gray-700">{remaining} of {need.quantity_requested} still needed</div>
                  <Link href={`/donor/needs/${need.id}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#000000] px-3 py-2 text-xs font-medium text-white hover:bg-[#da1a32]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Support this need
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#da1a32]" />
              <h2 className="text-lg font-bold text-[#000000]">Your Latest Disaster Deliveries</h2>
            </div>
            <div className="space-y-3">
              {recentDisasterDonations.map((donation) => (
                <div key={donation.id} className="rounded-xl border border-[#e5e5e5] p-4">
                  <div className="font-medium text-[#000000]">{donation.item_name}</div>
                  <div className="mt-1 text-sm text-gray-600">{donation.status}</div>
                  <div className="mt-1 text-xs text-gray-500">{new Date(donation.created_at).toLocaleString('en-GB')}</div>
                </div>
              ))}
              {!loading && !recentDisasterDonations.length && <div className="rounded-xl border border-[#e5e5e5] p-4 text-sm text-gray-500">No disaster-specific donations yet.</div>}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#da1a32]" />
              <h2 className="text-lg font-bold text-[#000000]">How This Fits The Workflow</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-700">
              Donors discover live disaster needs here, jump into the donation flow, and then follow their allocations and delivery impact through the normal tracking view.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
