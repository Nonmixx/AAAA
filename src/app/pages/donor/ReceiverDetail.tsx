'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, MapPin, Phone, Mail, Package, AlertCircle, Heart, ImageIcon, Truck, User } from 'lucide-react';
import { getNeedDisplayImage, getNeedMediaSource, getOrganizationInitials } from '@/lib/media';

type DeliveryMethod = 'platform_delivery' | 'self_delivery';

function deliveryMethodLabel(method: DeliveryMethod) {
  return method === 'self_delivery' ? 'Self drop' : 'Platform delivery';
}

type OrganizationRecord = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | null;
  is_emergency: boolean | null;
  emergency_reason: string | null;
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
  organizations: OrganizationRecord | OrganizationRecord[] | null;
};

function getOrganizationRecord(organization: NeedRecord['organizations']) {
  if (Array.isArray(organization)) return organization[0] ?? null;
  return organization;
}

function urgencyBadgeClasses(urgency: NeedRecord['urgency']) {
  if (urgency === 'high') {
    return {
      wrap: 'border-red-100 bg-red-50',
      icon: 'text-red-600',
      label: 'bg-red-100 text-red-600 border-red-200',
      qty: 'text-red-600',
      text: 'High Priority',
    };
  }
  if (urgency === 'low') {
    return {
      wrap: 'border-green-100 bg-green-50',
      icon: 'text-green-600',
      label: 'bg-green-100 text-green-600 border-green-200',
      qty: 'text-green-600',
      text: 'Lower Priority',
    };
  }
  return {
    wrap: 'border-yellow-100 bg-yellow-50',
    icon: 'text-yellow-600',
    label: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    qty: 'text-yellow-600',
    text: 'Medium Priority',
  };
}

function getVerificationBadge(status: OrganizationRecord['verification_status']) {
  if (status === 'approved') {
    return {
      label: 'Approved',
      className: 'bg-green-50 text-green-700 border-green-100',
    };
  }

  if (status === 'rejected') {
    return {
      label: 'Rejected',
      className: 'bg-gray-50 text-gray-600 border-gray-200',
    };
  }

  return {
    label: 'Pending Verification',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  };
}

export function ReceiverDetail() {
  const router = useRouter();
  const { id } = useParams();
  const needId = Array.isArray(id) ? id[0] : id;
  const stableNeedId = typeof needId === 'string' ? needId : '';
  const [need, setNeed] = useState<NeedRecord | null>(null);
  const [organizationNeeds, setOrganizationNeeds] = useState<NeedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [donationItemName, setDonationItemName] = useState('');
  const [donationQuantity, setDonationQuantity] = useState('1');
  const [donationDescription, setDonationDescription] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('platform_delivery');
  const [submittingDonation, setSubmittingDonation] = useState(false);
  const [donationSuccessMessage, setDonationSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadNeedDetails = async () => {
      if (!stableNeedId) return;

      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/donor/needs/${stableNeedId}`, { cache: 'no-store' });
        const json = (await response.json()) as {
          need?: NeedRecord | null;
          organizationNeeds?: NeedRecord[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error || 'Unable to load need details.');
        }

        const needRecord = json.need ?? null;
        const organization = getOrganizationRecord(needRecord?.organizations ?? null);
        if (!needRecord || !organization) {
          setErrorMessage('Need not found.');
          return;
        }

        setNeed(needRecord);
        const remaining = Math.max(0, needRecord.quantity_requested - needRecord.quantity_fulfilled);
        setDonationItemName(needRecord.title);
        setDonationQuantity(String(remaining > 0 ? Math.min(remaining, 1) : 1));
        setOrganizationNeeds(json.organizationNeeds ?? []);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load need details.');
      } finally {
        setLoading(false);
      }
    };

    void loadNeedDetails();
  }, [stableNeedId]);

  const organization = useMemo(() => getOrganizationRecord(need?.organizations ?? null), [need]);
  const currentVisualUrl = useMemo(() => {
    if (!need || !organization) return null;
    return getNeedDisplayImage(need.image_url, organization.logo_url);
  }, [need, organization]);
  const currentVisualSource = useMemo(() => {
    if (!need || !organization) return 'placeholder';
    return getNeedMediaSource(need.image_url, organization.logo_url);
  }, [need, organization]);
  const verificationBadge = useMemo(
    () => (organization ? getVerificationBadge(organization.verification_status) : null),
    [organization],
  );
  const remainingQuantity = useMemo(
    () => (need ? Math.max(0, need.quantity_requested - need.quantity_fulfilled) : 0),
    [need],
  );

  const handleDonateNow = async () => {
    if (!need) return;
    setErrorMessage(null);
    setDonationSuccessMessage(null);

    const quantity = Number(donationQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage('Please enter a donation quantity greater than 0.');
      return;
    }

    setSubmittingDonation(true);
    try {
      const response = await fetch('/api/donations/from-need', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          needId: need.id,
          itemName: donationItemName.trim() || need.title,
          quantity,
          description: donationDescription.trim() || undefined,
          deliveryMethod,
        }),
      });
      const json = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Unable to submit donation.');
      }

      setDonationSuccessMessage(
        json.message || 'Donation submitted successfully. The receiver can now review it in Incoming Donations.',
      );
      router.push('/donor/tracking');
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to submit donation.');
    } finally {
      setSubmittingDonation(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Loading need details...
        </div>
      </div>
    );
  }

  if (errorMessage || !need || !organization) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Link href="/donor/needs" className="text-[#da1a32] hover:text-[#b01528] mb-6 inline-block font-medium">
          &larr; Back to Needs List
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage ?? 'Need not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href="/donor/needs" className="text-[#da1a32] hover:text-[#b01528] mb-6 inline-block font-medium">
        &larr; Back to Needs List
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 border-2 border-[#e5e5e5] shadow-sm">
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#e5e5e5]">
              {currentVisualUrl ? (
                <img src={currentVisualUrl} alt={need.title} className="h-64 w-full object-cover" />
              ) : (
                <div className="flex h-64 w-full items-center justify-center bg-[linear-gradient(135deg,#111111_0%,#2a2a2a_45%,#da1a32_100%)] px-6 text-white">
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-bold">
                      {getOrganizationInitials(organization.name)}
                    </div>
                    <div className="mt-4 text-lg font-semibold">{organization.name}</div>
                  </div>
                </div>
              )}
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#000000] shadow-sm">
                {currentVisualSource === 'organization-logo' ? (
                  <span className="inline-flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Organization logo</span>
                ) : currentVisualSource === 'need-image' ? (
                  <span className="inline-flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" /> Need photo</span>
                ) : (
                  'Placeholder'
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-[#da1a32] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl mb-2 text-[#000000] font-bold">{need.title}</h1>
                  {verificationBadge && (
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${verificationBadge.className}`}>
                      {verificationBadge.label}
                    </span>
                  )}
                  {organization.is_emergency && (
                    <span className="rounded-full bg-[#da1a32] px-3 py-1 text-xs font-medium text-white">Emergency</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {organization.name} - {organization.address ?? 'Location pending'}
                </div>
              </div>
            </div>

            <div className="bg-[#edf2f4] border-2 border-[#e5e5e5] rounded-xl p-4 mb-6">
              <h3 className="font-medium mb-2 text-[#000000]">About Organization</h3>
              <p className="text-sm text-gray-600">
                {organization.description || `${organization.name} is currently requesting support through DonateAI.`}
              </p>
            </div>

            {organization.is_emergency && organization.emergency_reason && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#da1a32]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {organization.emergency_reason}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <Phone className="w-5 h-5 text-[#da1a32]" />
                <div>
                  <div className="text-sm text-gray-600">Contact Phone</div>
                  <div className="font-medium text-[#000000]">{organization.contact_phone || 'Not provided'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#edf2f4] rounded-xl border border-[#e5e5e5]">
                <Mail className="w-5 h-5 text-[#da1a32]" />
                <div>
                  <div className="text-sm text-gray-600">Contact Email</div>
                  <div className="font-medium text-[#000000]">{organization.contact_email || 'Not provided'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-[#e5e5e5] shadow-sm">
            <h2 className="text-xl mb-4 text-[#000000] font-bold">Current Needs</h2>
            <div className="space-y-4">
              {organizationNeeds.map((row) => {
                const c = urgencyBadgeClasses(row.urgency);
                const remaining = Math.max(0, row.quantity_requested - row.quantity_fulfilled);
                return (
                  <div key={row.id} className={`p-4 border-2 rounded-xl ${c.wrap}`}>
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex items-start gap-3">
                        <Package className={`w-6 h-6 mt-1 ${c.icon}`} />
                        <div>
                          <h3 className="font-medium text-lg text-[#000000]">{row.title}</h3>
                          <p className="text-sm text-gray-600">{row.description}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 font-medium ${c.label}`}>
                        {row.urgency === 'high' ? <AlertCircle className="w-3 h-3" /> : null}
                        {c.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`text-2xl font-bold ${c.qty}`}>{remaining} units remaining</div>
                      <div className="text-sm text-gray-600">
                        {row.quantity_fulfilled}/{row.quantity_requested} fulfilled
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-[#da1a32] to-[#b01528] rounded-2xl p-6 text-white sticky top-24 shadow-lg">
            <Heart className="w-12 h-12 mb-4" fill="white" />
            <h3 className="text-xl mb-3 font-bold">Support This Need</h3>
            <p className="text-white opacity-80 text-sm mb-6">
              {organization.is_emergency && organization.emergency_reason
                ? organization.emergency_reason
                : `${need.title} currently needs ${remainingQuantity} more units.`}
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/80">Item Name</label>
                <input
                  value={donationItemName}
                  onChange={(event) => setDonationItemName(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-sm text-[#000000] outline-none focus:ring-2 focus:ring-white/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/80">Quantity You Can Donate</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, remainingQuantity)}
                  value={donationQuantity}
                  onChange={(event) => setDonationQuantity(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-sm text-[#000000] outline-none focus:ring-2 focus:ring-white/60"
                />
                <p className="mt-1 text-[11px] text-white/70">Remaining unmet quantity: {remainingQuantity}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/80">Notes (Optional)</label>
                <textarea
                  value={donationDescription}
                  onChange={(event) => setDonationDescription(event.target.value)}
                  rows={3}
                  placeholder="Add any packing or delivery note for the receiver."
                  className="w-full rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-sm text-[#000000] outline-none focus:ring-2 focus:ring-white/60"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/80">Delivery Option</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('self_delivery')}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      deliveryMethod === 'self_delivery'
                        ? 'border-white bg-white text-[#000000]'
                        : 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <User className="h-3.5 w-3.5" />
                      Self drop
                    </div>
                    <p className={`mt-1 text-[10px] leading-snug ${deliveryMethod === 'self_delivery' ? 'text-gray-600' : 'text-white/75'}`}>
                      You bring the items yourself to the receiver.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('platform_delivery')}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      deliveryMethod === 'platform_delivery'
                        ? 'border-white bg-white text-[#000000]'
                        : 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Truck className="h-3.5 w-3.5" />
                      Platform delivery
                    </div>
                    <p className={`mt-1 text-[10px] leading-snug ${deliveryMethod === 'platform_delivery' ? 'text-gray-600' : 'text-white/75'}`}>
                      Platform coordinates the delivery handoff.
                    </p>
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-white/70">Selected: {deliveryMethodLabel(deliveryMethod)}</p>
              </div>
              <button
                onClick={() => void handleDonateNow()}
                disabled={submittingDonation || remainingQuantity <= 0}
                className="w-full bg-white text-[#da1a32] py-3 rounded-xl hover:bg-[#edf2f4] transition-all shadow-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingDonation ? 'Submitting...' : 'Donate This Need'}
              </button>
              <Link href="/donor/donate">
                <button className="w-full rounded-xl border border-white/25 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-all">
                  Open AI Donate Instead
                </button>
              </Link>
            </div>
            {donationSuccessMessage && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {donationSuccessMessage}
              </div>
            )}
            <div className="mt-4 text-center text-sm text-white opacity-80">This creates a pending donation for receiver review.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
