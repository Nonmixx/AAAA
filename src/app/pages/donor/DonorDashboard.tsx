import { useEffect, useMemo, useState } from 'react';
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
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDonorContext } from '../../context/DonorContext';

const stats = [
  { label: 'Total Donations', value: '24', icon: Package, color: 'bg-[#da1a32]' },
  { label: 'Items Donated', value: '1,250', icon: Heart, color: 'bg-[#000000]' },
  { label: 'Orgs Helped', value: '12', icon: Users, color: 'bg-[#da1a32]' },
  { label: 'Success Rate', value: '96%', icon: TrendingUp, color: 'bg-[#000000]' },
];

const recentDonations = [
  {
    id: 'DON-001',
    item: 'Food Packs',
    quantity: 100,
    org: 'Hope Orphanage',
    status: 'delivered',
    date: 'Apr 16, 2026',
  },
  {
    id: 'DON-002',
    item: 'Blankets',
    quantity: 50,
    org: 'Care Foundation',
    status: 'in-transit',
    date: 'Apr 18, 2026',
  },
  {
    id: 'DON-003',
    item: 'School Supplies',
    quantity: 75,
    org: 'Hope Orphanage',
    status: 'scheduled',
    date: 'Apr 19, 2026',
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Scheduled', color: 'bg-[#edf2f4] text-[#000000] border-[#e5e5e5]', icon: Clock },
  'in-transit': { label: 'In Transit', color: 'bg-yellow-50 text-yellow-600 border-yellow-100', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-50 text-green-600 border-green-100', icon: CheckCircle2 },
};

type NeedOrganization = {
  name: string;
  address: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | null;
  is_emergency?: boolean | null;
  emergency_reason?: string | null;
};

type NeedRecord = {
  id: string;
  title: string;
  category: string;
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

const quickActions = [
  {
    label: 'AI Donate',
    description: 'Let AI match your donation',
    icon: Sparkles,
    path: '/donor/donate',
    bg: 'bg-[#da1a32]',
  },
  {
    label: 'Browse Needs',
    description: 'Find organizations in need',
    icon: Search,
    path: '/donor/needs',
    bg: 'bg-[#000000]',
  },
  {
    label: 'Track Donations',
    description: 'Monitor your donations',
    icon: MapPin,
    path: '/donor/tracking',
    bg: 'bg-[#da1a32]',
  },
  {
    label: 'My Profile',
    description: 'View your impact & settings',
    icon: User,
    path: '/donor/profile',
    bg: 'bg-[#000000]',
  },
];

export function DonorDashboard() {
  const { emergencyMode } = useDonorContext();
  const [urgentNeeds, setUrgentNeeds] = useState<NeedRecord[]>([]);
  const [urgentNeedsLoading, setUrgentNeedsLoading] = useState(true);

  useEffect(() => {
    const loadUrgentNeeds = async () => {
      setUrgentNeedsLoading(true);

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('needs')
          .select('id, title, category, quantity_requested, quantity_fulfilled, urgency, organizations(name, address, verification_status, is_emergency, emergency_reason)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUrgentNeeds((data ?? []) as NeedRecord[]);
      } catch {
        setUrgentNeeds([]);
      } finally {
        setUrgentNeedsLoading(false);
      }
    };

    void loadUrgentNeeds();
  }, []);

  const displayedUrgentNeeds = useMemo(() => {
    const visible = urgentNeeds.filter((need) => {
      const organization = getOrganizationRecord(need.organizations);
      return !!organization;
    });

    const sorted = [...visible].sort((a, b) => {
      const orgA = getOrganizationRecord(a.organizations);
      const orgB = getOrganizationRecord(b.organizations);
      const emergencyA = orgA?.is_emergency ? 1 : 0;
      const emergencyB = orgB?.is_emergency ? 1 : 0;
      if (emergencyB !== emergencyA) return emergencyB - emergencyA;

      const urgencyRank: Record<NeedRecord['urgency'], number> = { high: 3, medium: 2, low: 1 };
      return urgencyRank[b.urgency] - urgencyRank[a.urgency];
    });

    if (emergencyMode) {
      return sorted.slice(0, 3);
    }

    return sorted.filter((need) => need.urgency === 'high' || getOrganizationRecord(need.organizations)?.is_emergency).slice(0, 3);
  }, [emergencyMode, urgentNeeds]);

  return (
    <div className="min-h-screen bg-white">
      {/* Welcome Banner */}
      <div className="bg-[#000000] text-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[#da1a32] text-sm font-medium mb-1">Welcome back 👋</p>
              <h1 className="text-3xl font-bold mb-2">Sarah Johnson</h1>
              <p className="text-white opacity-70">
                You've made a difference to <span className="text-white font-medium opacity-100">12 organizations</span> so far. Keep it up!
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
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-white border-2 border-[#e5e5e5] rounded-2xl p-6 hover:border-[#da1a32] transition-all hover:shadow-md"
              >
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
              {recentDonations.map((donation) => {
                const config = statusConfig[donation.status];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={donation.id}
                    className="bg-white border-2 border-[#e5e5e5] rounded-2xl p-5 hover:border-[#da1a32] transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-[#000000]">{donation.item}</div>
                          <div className="text-sm text-gray-500">
                            {donation.quantity} units → {donation.org}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{donation.date} • #{donation.id}</div>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border font-medium ${config.color}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })}
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
              {urgentNeedsLoading && (
                <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-4 text-sm text-gray-500">
                  Loading urgent needs...
                </div>
              )}

              {!urgentNeedsLoading && displayedUrgentNeeds.length === 0 && (
                <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-4 text-sm text-gray-500">
                  No urgent needs available right now.
                </div>
              )}

              {displayedUrgentNeeds.map((need) => {
                const organization = getOrganizationRecord(need.organizations);
                if (!organization) return null;

                const quantityRemaining = Math.max(0, need.quantity_requested - need.quantity_fulfilled);
                const urgentLabel = organization.is_emergency ? 'Emergency' : 'Urgent';

                return (
                  <div
                    key={need.id}
                    className="bg-white border-2 border-[#e5e5e5] rounded-2xl p-4 hover:border-[#da1a32] transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div>
                        <div className="font-bold text-[#000000] text-sm">{organization.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {getLocationLabel(organization.address)}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-red-50 text-[#da1a32] text-xs rounded-full border border-red-100 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {urgentLabel}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium text-[#000000]">{need.title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-[#000000]">{quantityRemaining}</span> remaining
                      </div>
                      <Link href={`/donor/needs/${need.id}`}>
                        <button className="text-xs px-3 py-1.5 bg-[#000000] text-white rounded-lg hover:bg-[#da1a32] transition-all font-medium">
                          Donate
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Impact Card */}
            <div className="mt-6 bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white shadow-lg">
              <Heart className="w-10 h-10 mb-3" fill="white" />
              <h3 className="font-bold text-lg mb-1">Your Impact</h3>
              <p className="text-white opacity-80 text-sm mb-4">
                You've helped <strong className="opacity-100">1,250 people</strong> through your generous contributions.
              </p>
              <Link href="/donor/profile">
                <button className="w-full bg-white text-[#da1a32] py-2.5 rounded-xl text-sm font-medium hover:bg-[#edf2f4] transition-all">
                  View Full Impact
                </button>
              </Link>
            </div>

            {/* Impact Visualization Card */}
            <div className="mt-4 bg-white border-2 border-[#e5e5e5] rounded-2xl p-5 hover:border-[#da1a32] transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Baby className="w-5 h-5 text-[#da1a32]" />
                <h3 className="font-bold text-[#000000] text-sm">Latest Impact</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Your last donation of <strong className="text-[#000000]">100 Food Packs</strong> helped:
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {Array.from({ length: 30 }).map((_, i) => (
                  <Smile key={i} className="w-4 h-4 text-[#da1a32]" />
                ))}
              </div>
              <p className="text-xs text-gray-500">
                <span className="font-bold text-[#000000] text-sm">30 children</span> at Hope Orphanage were fed
              </p>
              <Link href="/donor/tracking">
                <button className="mt-3 w-full text-xs text-[#da1a32] font-medium hover:text-[#b01528] text-center">
                  See full tracking →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
