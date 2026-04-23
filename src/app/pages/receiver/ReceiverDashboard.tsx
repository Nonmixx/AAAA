import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, AlertCircle, TrendingUp, Plus, Inbox } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentReceiverContext } from '@/lib/supabase/receiver';

type NeedRow = {
  id: string;
  title: string;
  urgency: 'low' | 'medium' | 'high';
  quantity_requested: number;
  quantity_fulfilled: number;
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
  const [urgentNeeds, setUrgentNeeds] = useState<NeedRow[]>([]);
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
          .select('id, title, urgency, quantity_requested, quantity_fulfilled, created_at')
          .eq('organization_id', context.organization.id)
          .order('created_at', { ascending: false });

        if (needsError) throw needsError;

        const activeNeedRows = (needs ?? []).filter((n) => n.quantity_fulfilled < n.quantity_requested);
        setActiveNeeds(activeNeedRows.length);

        const urgentNeedRows = (needs ?? [])
          .filter((n) => n.urgency === 'high')
          .slice(0, 3) as NeedRow[];
        setUrgentNeeds(urgentNeedRows);
        setUrgentAlerts(urgentNeedRows.length);

        const needIds = (needs ?? []).map((n) => n.id);
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">Dashboard</h1>
        <p className="text-gray-600">Overview of your organization&apos;s needs and incoming support</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#edf2f4] rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#da1a32]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl mb-1 text-[#000000] font-bold">{loading ? '-' : activeNeeds}</div>
          <div className="text-sm text-gray-600">Active Needs</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#edf2f4] rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#da1a32]" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl mb-1 text-[#000000] font-bold">{loading ? '-' : incomingDonations}</div>
          <div className="text-sm text-gray-600">Incoming Donations</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-3xl mb-1 text-[#000000] font-bold">{loading ? '-' : urgentAlerts}</div>
          <div className="text-sm text-gray-600">Urgent Alerts</div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Link href="/receiver/create-needs">
          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-8 text-white hover:shadow-xl transition-all cursor-pointer group">
            <Plus className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl mb-2 font-bold">Create New Need</h2>
            <p className="text-white opacity-80">Post your organization's requirements</p>
          </div>
        </Link>

        <Link href="/receiver/incoming">
          <div className="bg-gradient-to-br from-[#000000] to-[#000000] rounded-2xl p-8 text-white hover:shadow-xl transition-all cursor-pointer group">
            <Inbox className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl mb-2 font-bold">Incoming Donations</h2>
            <p className="text-white opacity-80">Review and manage donation offers</p>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm mb-6">
        <h3 className="text-xl mb-4 text-[#000000] font-bold">Urgent Needs</h3>
        <div className="space-y-4">
          {urgentNeeds.length === 0 && !loading && (
            <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4] px-4 py-6 text-sm text-gray-600">
              No urgent needs yet.
            </div>
          )}

          {urgentNeeds.map((need) => {
            const progress = need.quantity_requested === 0
              ? 0
              : Math.round((need.quantity_fulfilled / need.quantity_requested) * 100);

            return (
              <div key={need.id} className="flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#000000]">{need.title} - {need.quantity_requested} units</div>
                  <div className="text-sm text-gray-600">Posted {new Date(need.created_at).toLocaleDateString('en-GB')} • High Priority</div>
                </div>
                <div className="text-sm text-red-600 font-medium">{progress}% matched</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
        <h3 className="text-xl mb-4 text-[#000000] font-bold">Recent Donations</h3>
        <div className="space-y-4">
          {recentDonations.length === 0 && !loading && (
            <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4] px-4 py-6 text-sm text-gray-600">
              No donation activity yet.
            </div>
          )}

          {recentDonations.map((donation) => (
            <div key={donation.id} className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
              <div className="w-10 h-10 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-[#000000]">
                  {donation.allocated_quantity} {donation.donations?.item_name ?? 'Items'} from {donation.donations?.profiles?.full_name ?? 'Donor'}
                </div>
                <div className="text-sm text-gray-600">{new Date(donation.created_at).toLocaleDateString('en-GB')}</div>
              </div>
              <div className="px-3 py-1 bg-yellow-50 text-yellow-600 text-xs rounded-full border border-yellow-100 font-medium">
                {donation.status.replaceAll('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
