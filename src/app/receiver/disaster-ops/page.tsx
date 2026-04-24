'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Inbox, ShieldCheck, Waves } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentReceiverContext } from '@/lib/supabase/receiver';

type NeedRecord = {
  id: string;
  title: string;
  urgency: 'low' | 'medium' | 'high';
  quantity_requested: number;
  quantity_fulfilled: number;
  status: string;
  category: string;
  created_at: string;
};

type AllocationRecord = {
  id: string;
  status: string;
  allocated_quantity: number;
  donations: { item_name: string } | { item_name: string }[] | null;
};

export default function ReceiverDisasterOpsPage() {
  const [activeEventTitle, setActiveEventTitle] = useState<string | null>(null);
  const [needs, setNeeds] = useState<NeedRecord[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const context = await getCurrentReceiverContext();

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
          setAllocations([]);
          return;
        }

        const [{ data: event }, { data: needsData, error: needsError }] = await Promise.all([
          supabase.from('disaster_events').select('title').eq('id', activeDisasterEventId).maybeSingle(),
          supabase
            .from('needs')
            .select('id, title, urgency, quantity_requested, quantity_fulfilled, status, category, created_at')
            .eq('organization_id', context.organization.id)
            .eq('disaster_event_id', activeDisasterEventId)
            .order('created_at', { ascending: false }),
        ]);

        if (needsError) throw needsError;

        const needRows = (needsData ?? []) as NeedRecord[];
        const needIds = needRows.map((need) => need.id);

        const allocationsResult = needIds.length
          ? await supabase
              .from('donation_allocations')
              .select('id, status, allocated_quantity, donations(item_name)')
              .in('need_id', needIds)
              .order('created_at', { ascending: false })
              .limit(20)
          : { data: [], error: null };

        if (allocationsResult.error) throw allocationsResult.error;

        setActiveEventTitle(event?.title ?? 'Active disaster');
        setNeeds(needRows);
        setAllocations((allocationsResult.data ?? []) as AllocationRecord[]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load disaster ops.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const fulfillmentRatio = useMemo(() => {
    const requested = needs.reduce((sum, need) => sum + need.quantity_requested, 0);
    const fulfilled = needs.reduce((sum, need) => sum + need.quantity_fulfilled, 0);
    return requested > 0 ? Math.round((fulfilled / requested) * 100) : 0;
  }, [needs]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 rounded-3xl bg-[#000000] p-8 text-white">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#da1a32]/20 px-3 py-1 text-xs font-medium text-[#ffcad1]">
          <Waves className="h-4 w-4" />
          Shelter / Receiver Workflow
        </div>
        <h1 className="text-3xl font-bold">{loading ? 'Loading...' : activeEventTitle ?? 'No active disaster event'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          This page is your disaster-mode cockpit: keep urgent needs current, monitor inbound allocations, and confirm fulfillment through the normal incoming-donations workflow.
        </p>
      </div>

      {errorMessage && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Active Disaster Needs</div>
          <div className="mt-2 text-3xl font-bold text-[#000000]">{loading ? '-' : needs.length}</div>
        </div>
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Fulfillment Ratio</div>
          <div className="mt-2 text-3xl font-bold text-[#000000]">{loading ? '-' : `${fulfillmentRatio}%`}</div>
        </div>
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Incoming Allocations</div>
          <div className="mt-2 text-3xl font-bold text-[#000000]">{loading ? '-' : allocations.length}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#da1a32]" />
              <h2 className="text-lg font-bold text-[#000000]">Current Disaster Needs</h2>
            </div>
            <Link href="/receiver/create-needs" className="inline-flex items-center gap-2 rounded-xl bg-[#da1a32] px-4 py-2 text-sm font-medium text-white hover:bg-[#b01528]">
              Update needs
            </Link>
          </div>
          <div className="space-y-4">
            {needs.map((need) => (
              <div key={need.id} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#000000]">{need.title}</div>
                    <div className="mt-1 text-sm text-gray-600">{need.category} - {need.urgency}</div>
                  </div>
                  <span className="rounded-full bg-[#edf2f4] px-2 py-1 text-xs text-gray-600">{need.status}</span>
                </div>
                <div className="mt-3 text-sm text-gray-700">{need.quantity_fulfilled} / {need.quantity_requested} fulfilled</div>
              </div>
            ))}
            {!loading && !needs.length && <div className="rounded-xl border border-[#e5e5e5] p-4 text-sm text-gray-500">No disaster-linked needs yet. Create one from the Create Need page.</div>}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Inbox className="h-5 w-5 text-[#da1a32]" />
              <h2 className="text-lg font-bold text-[#000000]">Incoming Disaster Donations</h2>
            </div>
            <div className="space-y-3">
              {allocations.map((allocation) => (
                <div key={allocation.id} className="rounded-xl border border-[#e5e5e5] p-4">
                  <div className="font-medium text-[#000000]">{Array.isArray(allocation.donations) ? allocation.donations[0]?.item_name ?? 'Donation item' : allocation.donations?.item_name ?? 'Donation item'}</div>
                  <div className="mt-1 text-sm text-gray-600">{allocation.allocated_quantity} units - {allocation.status}</div>
                </div>
              ))}
              {!loading && !allocations.length && <div className="rounded-xl border border-[#e5e5e5] p-4 text-sm text-gray-500">No incoming allocations yet.</div>}
            </div>
            <Link href="/receiver/incoming" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#da1a32]">
              Open incoming donations workflow
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#da1a32]" />
              <h2 className="text-lg font-bold text-[#000000]">What Happens Next</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-700">
              Shelter outreach and message parsing happen on the admin operations side. Once your needs are active, donors see them in disaster relief, allocations are routed through logistics, and your team confirms receipt from the incoming donations page.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
