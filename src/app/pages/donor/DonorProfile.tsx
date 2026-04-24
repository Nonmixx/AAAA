'use client';

import { useCallback, useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Heart, Package, TrendingUp } from 'lucide-react';
import { fetchDonorProfileEditor, updateDonorProfile } from '@/lib/supabase/donor-profile';

export function DonorProfile() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const row = await fetchDonorProfileEditor();
      if (!row) {
        setErrorMessage('You need to be signed in to view this profile.');
        return;
      }
      setFullName(row.fullName);
      setEmail(row.email);
      setPhone(row.phone);
      setAddress(row.address);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSaving(true);
    try {
      await updateDonorProfile({ fullName, phone, address });
      setSuccessMessage('Profile saved. Your dashboard will show this name on your next visit.');
      void load();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('donor-profile-updated'));
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not save profile.');
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

            {loading ? (
              <p className="text-sm text-gray-500">Loading your profile…</p>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void handleSave(e)}>
                {errorMessage ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    {successMessage}
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm mb-2 text-[#000000] font-medium">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
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
                        readOnly
                        value={email}
                        className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed"
                        title="Email is managed by your login. Contact support to change it."
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Sign-in email (change via Supabase account settings if enabled).</p>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#000000] font-medium">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
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
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-[#e5e5e5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#da1a32] focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#da1a32] text-white px-6 py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            )}
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
