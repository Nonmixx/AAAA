import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, AlertCircle, TrendingUp, Plus, Inbox, Pencil } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentReceiverContext } from '@/lib/supabase/receiver';

type NeedRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  quantity_requested: number;
  quantity_fulfilled: number;
  status: string;
  is_emergency: boolean;
  needed_by: string | null;
  published_at: string | null;
  created_at: string;
};

type AllocationRow = {
  id: string;
  status: string;
  created_at: string;
  allocated_quantity: number;
  donations: {
    item_name: string;
    profiles: {
      full_name: string;
    } | null;
  } | null;
};

export function ReceiverDashboard() {
  const [activeNeeds, setActiveNeeds] = useState(0);
  const [incomingDonations, setIncomingDonations] = useState(0);
  const [urgentAlerts, setUrgentAlerts] = useState(0);
  const [allNeeds, setAllNeeds] = useState<NeedRow[]>([]);
  const [recentDonations, setRecentDonations] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const context = await getCurrentReceiverContext();

        const { data: needs, error: needsError } = await supabase
          .from('needs')
          .select('id, title, description, category, urgency, quantity_requested, quantity_fulfilled, status, is_emergency, needed_by, published_at, created_at')
          .eq('organization_id', context.organization.id)
          .order('created_at', { ascending: false });

        if (needsError) throw needsError;

        const needRows = (needs ?? []) as NeedRow[];
        setAllNeeds(needRows);

        const activeNeedRows = needRows.filter((n) => n.quantity_fulfilled < n.quantity_requested);
        setActiveNeeds(activeNeedRows.length);
        setUrgentAlerts(needRows.filter((n) => n.urgency === 'high').length);

        const needIds = needRows.map((n) => n.id);
        if (needIds.length === 0) {
          setIncomingDonations(0);
          setRecentDonations([]);
          return;
        }

        const { data: allocations, error: allocationsError } = await supabase
          .from('donation_allocations')
          .select('id, status, created_at, allocated_quantity, donations(item_name, profiles!donations_donor_profile_id_fkey(full_name))')
          .in('need_id', needIds)
          .order('created_at', { ascending: false });

        if (allocationsError) throw allocationsError;

        const pendingOrInProgress = (allocations ?? []).filter((a) =>
          ['pending', 'accepted', 'scheduled', 'in_transit', 'delivered', 'proof_uploaded'].includes(a.status)
        );

        setIncomingDonations(pendingOrInProgress.length);
        setRecentDonations((allocations ?? []).slice(0, 5) as AllocationRow[]);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[#000000]">Dashboard</h1>
        <p className="text-gray-600">Overview of your organization&apos;s needs and incoming support</p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf2f4]">
              <AlertCircle className="w-6 h-6 text-[#da1a32]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="mb-1 text-3xl font-bold text-[#000000]">{loading ? '-' : activeNeeds}</div>
          <div className="text-sm text-gray-600">Active Needs</div>
        </div>

        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf2f4]">
              <Package className="w-6 h-6 text-[#da1a32]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="mb-1 text-3xl font-bold text-[#000000]">{loading ? '-' : incomingDonations}</div>
          <div className="text-sm text-gray-600">Incoming Donations</div>
        </div>

        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mb-1 text-3xl font-bold text-[#000000]">{loading ? '-' : urgentAlerts}</div>
          <div className="text-sm text-gray-600">Urgent Alerts</div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Link href="/receiver/create-needs">
          <div className="group cursor-pointer rounded-2xl bg-gradient-to-br from-[#da1a32] to-[#b01528] p-8 text-white transition-all hover:shadow-xl">
            <Plus className="mb-4 h-12 w-12 transition-transform group-hover:scale-110" />
            <h2 className="mb-2 text-2xl font-bold">Create New Need</h2>
            <p className="text-white opacity-80">Post your organization&apos;s requirements</p>
          </div>
        </Link>

        <Link href="/receiver/incoming">
          <div className="group cursor-pointer rounded-2xl bg-gradient-to-br from-[#000000] to-[#000000] p-8 text-white transition-all hover:shadow-xl">
            <Inbox className="mb-4 h-12 w-12 transition-transform group-hover:scale-110" />
            <h2 className="mb-2 text-2xl font-bold">Incoming Donations</h2>
            <p className="text-white opacity-80">Review and manage donation offers</p>
          </div>
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-[#000000]">All Needs Created</h3>
        <div className="space-y-4">
          {allNeeds.length === 0 && !loading && (
            <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4] px-4 py-6 text-sm text-gray-600">
              No needs have been created yet.
            </div>
          )}

          {allNeeds.map((need) => {
            const progress = need.quantity_requested === 0
              ? 0
              : Math.round((need.quantity_fulfilled / need.quantity_requested) * 100);
            const urgencyStyles = need.urgency === 'high'
              ? 'bg-red-50 border-red-100 text-red-700'
              : need.urgency === 'medium'
                ? 'bg-yellow-50 border-yellow-100 text-yellow-700'
                : 'bg-green-50 border-green-100 text-green-700';
            const postedAt = need.published_at ?? need.created_at;

            return (
              <div key={need.id} className={`flex gap-4 rounded-xl border p-4 ${urgencyStyles}`}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-current/10 bg-white/70">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-[#000000]">{need.title}</div>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      {need.urgency}
                    </span>
                    {need.is_emergency && (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                        Emergency
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {need.quantity_requested} units requested
                    {need.needed_by && (
                      <span> • Needed by {new Date(need.needed_by).toLocaleDateString('en-GB')}</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Category: {need.category}
                  </div>
                  <div className="mt-2 whitespace-pre-line text-sm text-gray-700">
                    {need.description}
                  </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="rounded-full bg-white/70 px-2 py-1">
                      Posted {new Date(postedAt).toLocaleDateString('en-GB')}
                    </span>
                    <span className="rounded-full bg-white/70 px-2 py-1">
                      Status: {need.status.replaceAll('_', ' ')}
                    </span>
                    <span className="rounded-full bg-white/70 px-2 py-1">
                      {need.quantity_fulfilled} fulfilled
                    </span>
                  </div>
                  <div className="mt-4">
                    <Link
                      href={`/receiver/create-needs?need=${need.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#da1a32] bg-white px-3 py-2 text-sm font-medium text-[#da1a32] transition-colors hover:bg-[#da1a32] hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Need
                    </Link>
                  </div>
                </div>
                <div className="whitespace-nowrap text-sm font-medium text-[#000000]">{progress}% matched</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-[#000000]">Recent Donations</h3>
        <div className="space-y-4">
          {recentDonations.length === 0 && !loading && (
            <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4] px-4 py-6 text-sm text-gray-600">
              No donation activity yet.
            </div>
          )}

          {recentDonations.map((donation) => (
            <div key={donation.id} className="flex items-center gap-4 rounded-xl border border-[#e5e5e5] bg-[#edf2f4] p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#da1a32]">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-[#000000]">
                  {donation.allocated_quantity} {donation.donations?.item_name ?? 'Items'} from {donation.donations?.profiles?.full_name ?? 'Donor'}
                </div>
                <div className="text-sm text-gray-600">{new Date(donation.created_at).toLocaleDateString('en-GB')}</div>
              </div>
              <div className="rounded-full border border-yellow-100 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-600">
                {donation.status.replaceAll('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
