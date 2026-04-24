import { useEffect, useMemo, useState } from 'react';
import { User, Mail, Phone, ShieldCheck, Heart, Package, TrendingUp, MapPin } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type ProfileForm = {
  fullName: string;
  phone: string;
  address: string;
};

type DonationHistoryRow = {
  id: string;
  item_name: string;
  quantity_total: number;
  status: string;
  created_at: string;
  donation_allocations:
    | {
        need_id: string;
        needs:
          | {
              organizations:
                | {
                    name: string;
                  }
                | {
                    name: string;
                  }[]
                | null;
            }
          | {
              organizations:
                | {
                    name: string;
                  }
                | {
                    name: string;
                  }[]
                | null;
            }[]
          | null;
      }[]
    | null;
};

function getOrganizationNameFromAllocations(row: DonationHistoryRow) {
  const allocations = row.donation_allocations ?? [];
  const names = allocations
    .map((allocation) => {
      const needRecord = Array.isArray(allocation.needs) ? allocation.needs[0] : allocation.needs;
      const orgRecord = Array.isArray(needRecord?.organizations) ? needRecord?.organizations[0] : needRecord?.organizations;
      return orgRecord?.name ?? null;
    })
    .filter(Boolean) as string[];

  const uniqueNames = [...new Set(names)];
  if (uniqueNames.length === 0) return 'No allocation yet';
  if (uniqueNames.length === 1) return uniqueNames[0];
  return 'Multiple Organizations';
}

function formatDonationStatus(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadge(status: string) {
  if (status === 'completed') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'allocated' || status === 'matching') return 'bg-yellow-50 text-yellow-600 border-yellow-100';
  if (status === 'cancelled') return 'bg-gray-50 text-gray-600 border-gray-200';
  return 'bg-blue-50 text-blue-700 border-blue-100';
}

export function DonorProfile() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState<ProfileForm>({ fullName: '', phone: '', address: '' });
  const [donationHistory, setDonationHistory] = useState<DonationHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error('Please log in to view your donor profile.');

        setProfileId(user.id);
        setEmail(user.email ?? '');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, phone, address')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        setForm({
          fullName: profile?.full_name ?? user.user_metadata?.full_name ?? '',
          phone: profile?.phone ?? '',
          address: profile?.address ?? '',
        });

        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('id, item_name, quantity_total, status, created_at, donation_allocations(need_id, needs(organizations(name)))')
          .eq('donor_profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6);

        if (donationsError) throw donationsError;
        setDonationHistory((donations ?? []) as DonationHistoryRow[]);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load donor profile.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const impact = useMemo(() => {
    const totalDonations = donationHistory.length;
    const totalItems = donationHistory.reduce((sum, row) => sum + (row.quantity_total ?? 0), 0);
    const organizationsHelped = new Set(
      donationHistory
        .flatMap((row) => {
          const allocations = row.donation_allocations ?? [];
          return allocations
            .map((allocation) => {
              const needRecord = Array.isArray(allocation.needs) ? allocation.needs[0] : allocation.needs;
              const orgRecord = Array.isArray(needRecord?.organizations) ? needRecord?.organizations[0] : needRecord?.organizations;
              return orgRecord?.name ?? null;
            })
            .filter(Boolean) as string[];
        }),
    ).size;

    return { totalDonations, totalItems, organizationsHelped };
  }, [donationHistory]);

  const handleSave = async () => {
    if (!profileId) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.fullName,
          phone: form.phone || null,
          address: form.address || null,
        })
        .eq('id', profileId);

      if (error) throw error;
      setSuccessMessage('Profile updated successfully.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save donor profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[#000000] font-bold">My Profile</h1>
        <p className="text-gray-600">Manage your account and view your impact</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-6 text-[#000000] font-bold">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-[#000000] font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    defaultValue="Sarah Johnson"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      defaultValue="sarah.johnson@email.com"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      defaultValue="+60 12-345 6789"
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#000000] font-medium">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    disabled={loading}
                    placeholder="Enter your address"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent disabled:bg-[#edf2f4]"
                  />
                </div>
              </div>

              <button className="bg-[#da1a32] text-white px-6 py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium">
                Save Changes
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-6 text-[#000000] font-bold">Donation History</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#000000]">100 Food Packs</div>
                  <div className="text-sm text-gray-600">Hope Orphanage • April 16, 2026</div>
                </div>
                <div className="px-3 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-100 font-medium">
                  Delivered
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#000000]">50 Blankets</div>
                  <div className="text-sm text-gray-600">Care Foundation • April 18, 2026</div>
                </div>
                <div className="px-3 py-1 bg-yellow-50 text-yellow-600 text-xs rounded-full border border-yellow-100 font-medium">
                  In Transit
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#000000]">200 kg Rice</div>
                  <div className="text-sm text-gray-600">Multiple Organizations • April 10, 2026</div>
                </div>
                <div className="px-3 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-100 font-medium">
                  Delivered
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white shadow-lg">
            <Heart className="w-12 h-12 mb-4" fill="white" />
            <h3 className="text-xl mb-4 font-bold">Your Impact</h3>
            <div className="space-y-4">
              <div>
                <div className="text-3xl mb-1 font-bold">24</div>
                <div className="text-sm text-white opacity-80">Total Donations</div>
              </div>
              <div>
                <div className="text-3xl mb-1 font-bold">1,250</div>
                <div className="text-sm text-white opacity-80">Items Donated</div>
              </div>
              <div>
                <div className="text-3xl mb-1 font-bold">12</div>
                <div className="text-sm text-white opacity-80">Organizations Helped</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#da1a32]" />
              <h3 className="text-lg text-[#000000] font-bold">This Month</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Donations</span>
                <span className="font-medium text-[#000000]">5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Items</span>
                <span className="font-medium text-[#000000]">250</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Organizations</span>
                <span className="font-medium text-[#000000]">3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
