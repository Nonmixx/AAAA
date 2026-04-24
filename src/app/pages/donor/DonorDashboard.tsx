'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Package,
  Users,
  TrendingUp,
  Sparkles,
  Search,
  MapPin,
  User,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Baby,
  Smile,
} from 'lucide-react';
import { fetchDonorDisplayName } from '@/lib/supabase/donor-profile';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// --- Types ---
type DashboardStat = {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
};

type RecentDonation = {
  id: string;
  item: string;
  quantity: number;
  org: string;
  status: string;
  date: string;
};

type UrgentNeed = {
  id: string;
  org: string;
  item: string;
  quantity: number;
  location: string;
};

// --- Config ---
const initialStats: DashboardStat[] = [
  { label: 'Total Donations', value: '0', icon: Package, color: 'bg-[#da1a32]' },
  { label: 'Items Donated', value: '0', icon: Heart, color: 'bg-[#000000]' },
  { label: 'Orgs Helped', value: '0', icon: Users, color: 'bg-[#da1a32]' },
  { label: 'Success Rate', value: '0%', icon: TrendingUp, color: 'bg-[#000000]' },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Scheduled', color: 'bg-[#edf2f4] text-[#000000] border-[#e5e5e5]', icon: Clock },
  'in-transit': { label: 'In Transit', color: 'bg-yellow-50 text-yellow-600 border-yellow-100', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-50 text-green-600 border-green-100', icon: CheckCircle2 },
};

// Refined mapping to handle more enum states from schema
const statusMapping: Record<string, 'scheduled' | 'in-transit' | 'delivered'> = {
  pending: 'scheduled',
  accepted: 'scheduled',
  scheduled: 'scheduled',
  in_transit: 'in-transit',
  delivered: 'delivered',
  proof_uploaded: 'delivered',
  confirmed: 'delivered',
  cancelled: 'scheduled',
};

const quickActions = [
  { label: 'AI Donate', description: 'Let AI match your donation', icon: Sparkles, path: '/donor/donate', bg: 'bg-[#da1a32]' },
  { label: 'Browse Needs', description: 'Find organizations in need', icon: Search, path: '/donor/needs', bg: 'bg-[#000000]' },
  { label: 'Track Donations', description: 'Monitor your donations', icon: MapPin, path: '/donor/tracking', bg: 'bg-[#da1a32]' },
  { label: 'My Profile', description: 'View your impact & settings', icon: User, path: '/donor/profile', bg: 'bg-[#000000]' },
];

export function DonorDashboard() {
  const [displayName, setDisplayName] = useState('…');
  const [stats, setStats] = useState<DashboardStat[]>(initialStats);
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
  const [urgentNeeds, setUrgentNeeds] = useState<UrgentNeed[]>([]);
  const [totalImpact, setTotalImpact] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshName = useCallback(async () => {
    try {
      const name = await fetchDonorDisplayName();
      setDisplayName(name);
    } catch {
      setDisplayName('Donor');
    }
  }, []);

  useEffect(() => {
    void refreshName();
    const onProfileSaved = () => void refreshName();
    window.addEventListener('donor-profile-updated', onProfileSaved);
    return () => window.removeEventListener('donor-profile-updated', onProfileSaved);
  }, [refreshName]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setErrorMessage('Please log in to view your dashboard.');
          setLoading(false);
          return;
        }

        // Optimized fetching: Separating Donations and Allocations for accuracy
        const [donationsRes, allocationsRes, urgentNeedsRes] = await Promise.all([
          supabase
            .from('donations')
            .select('id, quantity_total')
            .eq('donor_profile_id', user.id),
          supabase
            .from('donation_allocations')
            .select(`
              id, status, allocated_quantity, created_at, impact_count,
              donations(item_name),
              needs(organizations(name, location_name))
            `)
            .order('created_at', { ascending: false }),
          supabase
            .from('needs')
            .select('id, title, quantity_requested, organizations(name, location_name)')
            .or('is_emergency.eq.true,urgency.eq.high')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(3),
        ]);

        if (donationsRes.error) throw donationsRes.error;
        if (allocationsRes.error) throw allocationsRes.error;
        if (urgentNeedsRes.error) throw urgentNeedsRes.error;

        // Calculate Stats
        const totalDonationsCount = donationsRes.data?.length ?? 0;
        const totalItemsCount = donationsRes.data?.reduce((sum, d) => sum + d.quantity_total, 0) ?? 0;
        
        const allocations = allocationsRes.data ?? [];
        const orgNames = new Set(allocations.map(a => a.needs?.organizations?.name).filter(Boolean));
        const deliveredCount = allocations.filter(a => ['delivered', 'proof_uploaded', 'confirmed'].includes(a.status)).length;
        const successRate = allocations.length > 0 ? Math.round((deliveredCount / allocations.length) * 100) : 0;
        
        // Dynamic Impact
        const impactSum = allocations.reduce((sum, a) => sum + (a.impact_count ?? 0), 0);
        setTotalImpact(impactSum);

        setStats([
          { label: 'Total Donations', value: `${totalDonationsCount}`, icon: Package, color: 'bg-[#da1a32]' },
          { label: 'Items Donated', value: `${totalItemsCount.toLocaleString()}`, icon: Heart, color: 'bg-[#000000]' },
          { label: 'Orgs Helped', value: `${orgNames.size}`, icon: Users, color: 'bg-[#da1a32]' },
          { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: 'bg-[#000000]' },
        ]);

        // Map Recent Donations (Handling Single Objects instead of as any[])
        setRecentDonations(
          allocations.slice(0, 5).map((item) => ({
            id: item.id.slice(0, 8).toUpperCase(),
            item: item.donations?.item_name ?? 'Donation',
            quantity: item.allocated_quantity ?? 0,
            org: item.needs?.organizations?.name ?? 'Unknown',
            status: statusMapping[item.status] ?? 'scheduled',
            date: item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending',
          }))
        );

        // 4. Map Urgent Needs
        setUrgentNeeds(
          (urgentNeedsRes.data ?? []).map((need) => ({
            id: need.id,
            org: need.organizations?.name ?? 'Unknown',
            item: need.title,
            quantity: need.quantity_requested ?? 0,
            location: need.organizations?.location_name ?? 'Unknown',
          }))
        );

      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load donor dashboard.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  const orgsHelpedCount = stats.find((stat) => stat.label === 'Orgs Helped')?.value ?? '0';

  return (
    <div className="min-h-screen bg-white">
      {/* Welcome Banner */}
      <div className="bg-[#000000] text-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[#da1a32] text-sm font-medium mb-1">Welcome back </p>
              <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
              <p className="text-white opacity-70">
                You&apos;ve sent your love to{' '}
                <span className="text-white font-medium opacity-100">{orgsHelpedCount} organizations</span> so far. Keep it up!
              </p>
            </div>
            <Link href="/donor/donate">
              <button className="flex items-center gap-2 px-6 py-3 bg-[#da1a32] text-white rounded-lg hover:bg-[#b01528] transition-all font-medium shadow-lg">
                <Sparkles className="w-5 h-5" />
                Start Donating
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white border-2 border-[#e5e5e5] rounded-2xl p-6 hover:border-[#da1a32] transition-all hover:shadow-md">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-[#000000] mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-[#000000] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} href={action.path}>
                  <div className="bg-white border-2 border-[#e5e5e5] rounded-2xl p-5 hover:border-[#da1a32] hover:shadow-md transition-all cursor-pointer group">
                    <div className={`w-12 h-12 ${action.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="font-bold text-[#000000] mb-1">{action.label}</div>
                    <div className="text-xs text-gray-500">{action.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Donations */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#000000]">Recent Donations</h2>
              <Link href="/donor/tracking" className="text-sm text-[#da1a32] hover:text-[#b01528] font-medium flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                   {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl border-2 border-[#e5e5e5]" />)}
                </div>
              ) : recentDonations.length === 0 ? (
                <div className="rounded-2xl border border-[#e5e5e5] bg-white p-8 text-center shadow-sm">
                  <p className="text-lg font-semibold text-[#000000] mb-3">No donations yet</p>
                  <p className="text-sm text-gray-600 mb-4">Once you donate, your latest contributions will appear here.</p>
                  <Link href="/donor/donate">
                    <button className="inline-flex items-center gap-2 px-5 py-3 bg-[#da1a32] text-white rounded-xl hover:bg-[#b01528] transition-all">
                      <Sparkles className="w-4 h-4" /> Make your first donation
                    </button>
                  </Link>
                </div>
              ) : (
                recentDonations.map((donation) => {
                  const config = statusConfig[donation.status];
                  const StatusIcon = config.icon;
                  return (
                    <div key={donation.id} className="bg-white border-2 border-[#e5e5e5] rounded-2xl p-5 hover:border-[#da1a32] transition-all hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-[#000000]">{donation.item}</div>
                            <div className="text-sm text-gray-500">{donation.quantity} units → {donation.org}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{donation.date} • #{donation.id}</div>
                          </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border font-medium ${config.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Urgent Needs */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#000000]">Urgent Needs</h2>
              <Link href="/donor/needs" className="text-sm text-[#da1a32] hover:text-[#b01528] font-medium flex items-center gap-1">
                Browse <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {urgentNeeds.map((need) => (
                <div key={need.id} className="bg-white border-2 border-[#e5e5e5] rounded-2xl p-4 hover:border-[#da1a32] transition-all hover:shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-[#000000] text-sm">{need.org}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{need.location}</div>
                    </div>
                    <span className="px-2 py-0.5 bg-red-50 text-[#da1a32] text-xs rounded-full border border-red-100 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Urgent
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600"><span className="font-medium text-[#000000]">{need.quantity}</span> {need.item}</div>
                    <Link href={`/donor/needs/${need.id}`}>
                      <button className="text-xs px-3 py-1.5 bg-[#000000] text-white rounded-lg hover:bg-[#da1a32] transition-all font-medium">Donate</button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Impact Card - dynamic using impact_count */}
            <div className="mt-6 bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white shadow-lg">
              <Heart className="w-10 h-10 mb-3" fill="white" />
              <h3 className="font-bold text-lg mb-1">Your Impact</h3>
              <p className="text-white opacity-80 text-sm mb-4">
                You've helped <strong className="opacity-100">{totalImpact.toLocaleString()} lives</strong> through your generous contributions.
              </p>
              <Link href="/donor/profile">
                <button className="w-full bg-white text-[#da1a32] py-2.5 rounded-xl text-sm font-medium hover:bg-[#edf2f4] transition-all">View Full Impact</button>
              </Link>
            </div>

            {/* Impact Visualization Card */}
            <div className="mt-4 bg-white border-2 border-[#e5e5e5] rounded-2xl p-5 hover:border-[#da1a32] transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Baby className="w-5 h-5 text-[#da1a32]" />
                <h3 className="font-bold text-[#000000] text-sm">Latest Impact</h3>
              </div>
              {recentDonations[0] ? (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    Your last donation of <strong className="text-[#000000]">{recentDonations[0].item}</strong> helped:
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {Array.from({ length: Math.min(recentDonations[0].quantity, 30) }).map((_, i) => (
                      <Smile key={i} className="w-4 h-4 text-[#da1a32]" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Lives touched at <span className="font-bold text-[#000000]">{recentDonations[0].org}</span>
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-500">No impact data available yet.</p>
              )}
              <Link href="/donor/tracking">
                <button className="mt-3 w-full text-xs text-[#da1a32] font-medium hover:text-[#b01528] text-center">See full tracking →</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}