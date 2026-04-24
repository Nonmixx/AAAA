'use client';

import { useEffect, useMemo, useState } from 'react';
import { User, Mail, Phone, Heart, Package, MapPin } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// --- Improved Types based on schema.sql ---
type ProfileForm = {
  fullName: string;
  phone: string;
  address: string;
};

type AllocationHistoryRow = {
  id: string;
  allocated_quantity: number;
  status: string;
  created_at: string;
  donations: { item_name: string } | null;
  needs: { organizations: { name: string } | null } | null;
};

function formatDonationStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
}

function getStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (['completed', 'delivered', 'confirmed', 'proof_uploaded'].includes(s)) 
    return 'bg-green-50 text-green-600 border-green-100';
  if (['allocated', 'matching', 'pending', 'scheduled', 'in_transit'].includes(s)) 
    return 'bg-yellow-50 text-yellow-600 border-yellow-100';
  if (s === 'cancelled' || s === 'rejected') 
    return 'bg-gray-50 text-gray-600 border-gray-200';
  return 'bg-blue-50 text-blue-700 border-blue-100';
}

export function DonorProfile() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState<ProfileForm>({ fullName: '', phone: '', address: '' });
  const [donationHistory, setDonationHistory] = useState<AllocationHistoryRow[]>([]);
  
  // New State for correct calculations
  const [stats, setStats] = useState({ totalDonations: 0, totalItems: 0, orgsHelped: 0 });
  
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
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error('Please log in to view your donor profile.');

        setProfileId(user.id);
        setEmail(user.email ?? '');

        // Fetch Profile & Total Stats & Allocations in parallel for efficiency
        const [profileRes, totalDonationsRes, allocationsRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, phone, address').eq('id', user.id).maybeSingle(),
          supabase.from('donations').select('quantity_total').eq('donor_profile_id', user.id),
          supabase.from('donation_allocations').select(`
            id, allocated_quantity, status, created_at,
            donations(item_name),
            needs(organizations(name))
          `)
          .eq('donations.donor_profile_id', user.id)
          .order('created_at', { ascending: false })
        ]);

        if (profileRes.error) throw profileRes.error;
        
        // Set Form Data
        setForm({
          fullName: profileRes.data?.full_name ?? user.user_metadata?.full_name ?? '',
          phone: profileRes.data?.phone ?? '',
          address: profileRes.data?.address ?? '',
        });

        // Total Donations = All rows in 'donations' table
        const totalDonations = totalDonationsRes.data?.length ?? 0;
        // Total Items = Sum of 'quantity_total' in 'donations' table
        const totalItems = totalDonationsRes.data?.reduce((sum, d) => sum + (d.quantity_total ?? 0), 0) ?? 0;
        // Orgs Helped = Unique organizations in the 'allocations' list
        const uniqueOrgs = new Set(
          (allocationsRes.data ?? [])
            .map(a => a.needs?.organizations?.name)
            .filter(Boolean)
        ).size;

        setStats({ totalDonations, totalItems, orgsHelped: uniqueOrgs });

        // Set History (Limit to 6 for the UI)
        setDonationHistory((allocationsRes.data ?? []).slice(0, 6) as unknown as AllocationHistoryRow[]);

      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load donor profile.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

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
      window.dispatchEvent(new Event('donor-profile-updated'));
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

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      )}
      {successMessage && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</div>
      )}

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
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent disabled:bg-[#edf2f4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#000000] font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl bg-[#edf2f4] text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#000000] font-medium">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent disabled:bg-[#edf2f4]"
                  />
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
                    placeholder="Enter your address (Optional)"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent disabled:bg-[#edf2f4]"
                  />
                </div>
              </div>

              <button
                onClick={() => void handleSave()}
                disabled={loading || saving || !profileId}
                className="bg-[#da1a32] text-white px-6 py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-6 text-[#000000] font-bold">Recent History</h2>
            <div className="space-y-4">
              {!loading && donationHistory.length === 0 ? (
                <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4] px-4 py-6 text-sm text-gray-600">
                  No allocations recorded yet.
                </div>
              ) : null}

              {donationHistory.map((donation) => (
                <div key={donation.id} className="flex items-center gap-4 p-4 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                  <div className="w-12 h-12 bg-[#da1a32] rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[#000000]">
                      {donation.allocated_quantity} {donation.donations?.item_name ?? 'Donation'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {donation.needs?.organizations?.name ?? 'Unknown Org'} • {new Date(donation.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div className={`px-3 py-1 text-xs rounded-full border font-medium ${getStatusBadge(donation.status)}`}>
                    {formatDonationStatus(donation.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white shadow-lg">
            <Heart className="w-12 h-12 mb-4" fill="white" />
            <h3 className="text-xl mb-4 font-bold">Your Total Impact</h3>
            <div className="space-y-4">
              <div>
                <div className="text-3xl mb-1 font-bold">{loading ? '-' : stats.totalDonations}</div>
                <div className="text-sm text-white opacity-80">Total Donations Made</div>
              </div>
              <div>
                <div className="text-3xl mb-1 font-bold">{loading ? '-' : stats.totalItems.toLocaleString()}</div>
                <div className="text-sm text-white opacity-80">Total Items Donated</div>
              </div>
              <div>
                <div className="text-3xl mb-1 font-bold">{loading ? '-' : stats.orgsHelped}</div>
                <div className="text-sm text-white opacity-80">Organizations Helped</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg text-[#000000] font-bold">Account Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profile ID</span>
                <span className="font-medium text-[#000000]">{profileId ? `${profileId.slice(0, 8)}...` : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Role</span>
                <span className="font-medium text-[#000000]">Donor</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Login Email</span>
                <span className="font-medium text-[#000000] text-right break-all">{email || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}