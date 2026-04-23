'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Leaf,
  Cloud,
  HandHeart,
  ShieldCheck,
  Goal,
  Loader2,
  FileText,
  Boxes,
  Truck,
  Camera,
  X,
} from 'lucide-react';

type ReportState = 'idle' | 'loading' | 'ready';
type LedgerStatus = 'pending' | 'completed' | 'delivered';
type LedgerItem = {
  id: string;
  dateLabel: string;
  activityType: string;
  amountOrQty: string;
  esgFocus: string;
  status: LedgerStatus;
  actionLabel: 'View Details' | 'View Receipt';
  notes?: string;
};

const METRICS = [
  {
    title: 'Waste Diverted from Landfill',
    value: '500 kg',
    icon: Leaf,
    tone: 'text-green-700 bg-green-50 border-green-100',
  },
  {
    title: 'CO2 Emissions Saved',
    value: '1.2 Tons',
    icon: Cloud,
    tone: 'text-sky-700 bg-sky-50 border-sky-100',
  },
  {
    title: 'Individuals Supported',
    value: '2,500',
    icon: HandHeart,
    tone: 'text-[#da1a32] bg-red-50 border-red-100',
  },
  {
    title: 'Verified NGO Handoffs',
    value: '100%',
    icon: ShieldCheck,
    tone: 'text-purple-700 bg-purple-50 border-purple-100',
  },
];

const ESG_REPORT = `# Q1 2026 Sustainability & ESG Report (Corporate Partner)\n\n## Executive Summary\nYour organization contributed materially to circular-economy and social-impact outcomes this quarter through item donation routing optimized by DonateAI. Portfolio impact shows balanced environmental, social, and governance performance with high handoff integrity.\n\n## Environmental Performance\n- Waste diverted from landfill: 500 kg\n- Estimated CO2 emissions saved: 1.2 tons\n- Major drivers: electronics repurposing and multi-NGO redistribution efficiency\n\n## Social Performance\n- Individuals supported: 2,500\n- High-impact channels: food routing, education equipment access, urgent-needs fulfillment\n- SDG alignment observed: SDG 2, SDG 4, SDG 12\n\n## Governance & Assurance\n- Verified NGO handoffs: 100%\n- Chain-of-custody confidence: high\n- Documentation posture: suitable for annual sustainability reporting appendix\n\n## AI Strategic Recommendations (Next Quarter)\n1. Launch a winter-clothing collection wave in early next month to preempt seasonal shortage signals.\n2. Maintain electronics donation cadence to preserve digital inclusion gains.\n3. Pilot a targeted food surplus routing day with pre-committed logistics windows to increase fulfillment speed.\n\n## Suggested Board-Level KPI Additions\n- % of donation volume routed to urgent-need cases\n- Repeat NGO reliability score\n- Cost-per-beneficiary equivalent (estimated)\n`;

export default function CorporateDashboardPage() {
  const router = useRouter();
  const [reportState, setReportState] = useState<ReportState>('idle');
  const [showBulkDonationModal, setShowBulkDonationModal] = useState(false);
  const [impactEvents, setImpactEvents] = useState<string[]>([
    'RM 15 from your wallet funded a delivery of Textbooks to Hope School.',
    'Your bulk donation of 20 Monitors arrived at Pages Library.',
  ]);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | LedgerStatus>('all');
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([
    {
      id: 'bulk-it-22apr',
      dateLabel: '22 Apr 2026',
      activityType: 'Bulk Asset: IT & Electronics',
      amountOrQty: '50 units',
      esgFocus: 'SDG 12',
      status: 'pending',
      actionLabel: 'View Details',
      notes: 'Queued for NGO matching.',
    },
    {
      id: 'sponsor-20apr',
      dateLabel: '20 Apr 2026',
      activityType: 'Logistics Sponsorship: Hope School',
      amountOrQty: 'RM 15.00',
      esgFocus: 'SDG 4',
      status: 'completed',
      actionLabel: 'View Receipt',
    },
    {
      id: 'bulk-monitors-15apr',
      dateLabel: '15 Apr 2026',
      activityType: 'Bulk Asset: Office Monitors',
      amountOrQty: '20 units',
      esgFocus: 'SDG 12',
      status: 'delivered',
      actionLabel: 'View Receipt',
    },
  ]);
  const [assetCategory, setAssetCategory] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState('');
  const [assetCondition, setAssetCondition] = useState<'like_new' | 'gently_used' | 'minor_repair'>('like_new');
  const [pickupLocation, setPickupLocation] = useState('');
  const [availablePickupDate, setAvailablePickupDate] = useState('');
  const [contactName, setContactName] = useState('Aisyah Rahman');
  const [contactPhone, setContactPhone] = useState('+60 12-345 6789');
  const [primaryImpactGoal, setPrimaryImpactGoal] = useState('SDG 12: Responsible Consumption and Production');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const generateReport = () => {
    if (reportState === 'loading') return;
    setReportState('loading');
    window.setTimeout(() => setReportState('ready'), 2200);
  };

  const createBulkDonationDraft = () => {
    setShowBulkDonationModal(true);
  };

  const submitBulkDonation = () => {
    if (!assetCategory || !itemDescription || !totalUnits || !pickupLocation || !availablePickupDate) {
      window.alert('Please complete all required donation fields before submitting.');
      return;
    }
    setImpactEvents((prev) => [
      `Bulk donation submitted: ${totalUnits} units (${assetCategory}) queued for AI matching under ${primaryImpactGoal}.`,
      ...prev,
    ]);
    const today = new Date();
    const dateLabel = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    setLedgerItems((prev) => [
      {
        id: `bulk-${today.getTime()}`,
        dateLabel,
        activityType: `Bulk Asset: ${assetCategory}`,
        amountOrQty: `${totalUnits} units`,
        esgFocus: primaryImpactGoal.replace(':', '').slice(0, 6).includes('SDG')
          ? primaryImpactGoal.split(':')[0]
          : 'SDG 12',
        status: 'pending',
        actionLabel: 'View Details',
        notes: itemDescription,
      },
      ...prev,
    ]);
    setShowBulkDonationModal(false);
  };

  const openLedgerAction = (item: LedgerItem) => {
    if (item.actionLabel === 'View Receipt') {
      const receipt = [
        `Receipt`,
        `Date: ${item.dateLabel}`,
        `Activity: ${item.activityType}`,
        `Amount/Qty: ${item.amountOrQty}`,
        `ESG Focus: ${item.esgFocus}`,
        `Status: ${item.status}`,
      ].join('\n');
      const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.id}-receipt.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    window.alert(`${item.activityType}\n\n${item.notes || 'Pending AI match and logistics routing.'}`);
  };

  const statusBadge = (status: LedgerStatus) => {
    if (status === 'pending') {
      return <span className="inline-flex rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">⏳ Pending AI Match</span>;
    }
    if (status === 'completed') {
      return <span className="inline-flex rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-800">✅ Completed</span>;
    }
    return <span className="inline-flex rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-800">✅ Delivered</span>;
  };

  const goToWalletTopUp = () => {
    router.push('/corporate/profile?tab=wallet');
  };

  if (reportState === 'loading') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-8">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#da1a32]" />
            <h1 className="text-xl font-bold text-[#000000]">GLM Report Generation In Progress</h1>
          </div>
          <p className="text-gray-600 text-sm">
            GLM is analyzing 1,420 transaction nodes, donor behavior signals, and verified handoff logs to draft your
            Q1 2026 ESG narrative...
          </p>
        </div>
      </div>
    );
  }

  if (reportState === 'ready') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-8">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#da1a32]" />
              <h1 className="text-xl font-bold text-[#000000]">Generated ESG Report</h1>
            </div>
            <button
              onClick={() => setReportState('idle')}
              className="text-sm border border-[#e5e5e5] px-3 py-1.5 rounded-lg hover:bg-[#edf2f4] transition-all"
            >
              Back to Dashboard
            </button>
          </div>
          <article className="prose prose-sm max-w-none whitespace-pre-line text-[#000000] leading-relaxed">
            {ESG_REPORT}
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            ESG REPORTING TRIGGER
          </p>
          <h1 className="text-2xl font-bold text-[#000000]">Q1 2026 Sustainability & ESG Report is Ready.</h1>
          <p className="text-sm text-gray-600 mt-1">
            Generate a polished, copy-ready narrative from your tracked bulk donations and sponsored logistics data.
          </p>
        </div>
        <button
          onClick={generateReport}
          className="inline-flex items-center justify-center gap-2 bg-[#da1a32] text-white px-5 py-3 rounded-xl hover:bg-[#b01528] transition-all shadow-sm font-medium"
        >
          <Download className="w-4 h-4" /> Generate ESG Report
        </button>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.title} className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
              <div className={`inline-flex items-center justify-center rounded-xl border p-2 ${m.tone}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-[#000000] mt-3">{m.value}</p>
              <p className="text-sm text-gray-600 mt-1">{m.title}</p>
            </div>
          );
        })}
      </section>

      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Goal className="w-4 h-4 text-[#da1a32]" />
          <h2 className="text-lg font-bold text-[#000000]">Make an Impact</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-[#e5e5e5] bg-[#edf2f4]/30 p-5">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center">
              <Boxes className="w-5 h-5 text-[#da1a32]" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#000000]">Donate Corporate Assets</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Clear out surplus inventory or office equipment. Your items will be directly matched with verified NGOs.
            </p>
            <button
              onClick={createBulkDonationDraft}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#da1a32] text-white text-sm font-medium hover:bg-[#b01528] transition-all"
            >
              + New Bulk Donation
            </button>
          </div>
          <div className="rounded-xl border-2 border-[#e5e5e5] bg-[#edf2f4]/30 p-5">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#da1a32]" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#000000]">Fund Community Logistics</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Sponsor delivery fees for individual donors who cannot transport their items to charities.
            </p>
            <button
              onClick={goToWalletTopUp}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#000000] text-white text-sm font-medium hover:bg-[#1f1f1f] transition-all"
            >
              + Top Up Logistics Wallet
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Goal className="w-4 h-4 text-[#da1a32]" />
          <h2 className="text-lg font-bold text-[#000000]">Live Impact</h2>
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          {impactEvents.map((event) => (
            <div key={event} className="rounded-lg border border-[#e5e5e5] bg-[#edf2f4]/40 px-3 py-2.5">
              {event}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#000000]">📋 Donation & Sponsorship Ledger</h2>
            <p className="text-sm text-gray-600">Track the status of your bulk asset submissions and logistics funding.</p>
          </div>
          <label className="text-sm text-gray-600">
            <span className="mr-2">Filter:</span>
            <select
              value={ledgerFilter}
              onChange={(e) => setLedgerFilter(e.target.value as 'all' | LedgerStatus)}
              className="rounded-lg border border-[#e5e5e5] px-2.5 py-1.5 text-sm"
            >
              <option value="all">All Activity</option>
              <option value="pending">Pending AI Match</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-[#edf2f4]/70 text-left text-gray-600">
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Activity Type</th>
                <th className="px-3 py-2.5 font-semibold">Amount / Qty</th>
                <th className="px-3 py-2.5 font-semibold">ESG Focus</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {ledgerItems
                .filter((item) => (ledgerFilter === 'all' ? true : item.status === ledgerFilter))
                .map((item) => (
                  <tr key={item.id} className="border-b border-[#edf2f4] last:border-b-0">
                    <td className="px-3 py-3 text-gray-700">{item.dateLabel}</td>
                    <td className="px-3 py-3 text-[#000000] font-medium">{item.activityType}</td>
                    <td className="px-3 py-3 text-gray-700">{item.amountOrQty}</td>
                    <td className="px-3 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-xs border border-[#e5e5e5] bg-[#edf2f4]">{item.esgFocus}</span>
                    </td>
                    <td className="px-3 py-3">{statusBadge(item.status)}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => openLedgerAction(item)}
                        className="inline-flex items-center rounded-lg border border-[#e5e5e5] px-2.5 py-1.5 text-xs font-medium hover:bg-[#edf2f4] transition-all"
                      >
                        {item.actionLabel}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/corporate/reports')}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#da1a32] hover:underline underline-offset-2"
          >
            View Full History ➔
          </button>
        </div>
      </section>

      {showBulkDonationModal ? (
        <div className="fixed inset-0 z-[80] bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-2xl">
            <div className="p-5 border-b border-[#e5e5e5] flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-[#000000]">📦 Submit Corporate Assets for Donation</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enter the details of your surplus assets. Our system will route these items to verified NGOs to maximize your ESG impact.
                </p>
              </div>
              <button
                onClick={() => setShowBulkDonationModal(false)}
                className="rounded-lg p-1.5 hover:bg-[#edf2f4] text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <section>
                <h4 className="text-sm font-bold text-[#000000] mb-3">Section 1: Asset Details</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="text-sm text-gray-700">
                    Asset Category (Dropdown):
                    <select
                      value={assetCategory}
                      onChange={(e) => setAssetCategory(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    >
                      <option value="">Select Category</option>
                      <option>IT & Electronics</option>
                      <option>Office Furniture</option>
                      <option>Surplus Apparel</option>
                      <option>Non-Perishable Food</option>
                    </select>
                  </label>
                  <label className="text-sm text-gray-700 md:col-span-2">
                    Item Description (Text Area):
                    <textarea
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Briefly describe the items (e.g., 50 Dell Monitors, gently used)"
                      className="mt-1.5 w-full min-h-[90px] rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Total Units:
                    <input
                      value={totalUnits}
                      onChange={(e) => setTotalUnits(e.target.value)}
                      placeholder="e.g., 50"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Estimated Total Weight (kg):
                    <input
                      value={estimatedWeightKg}
                      onChange={(e) => setEstimatedWeightKg(e.target.value)}
                      placeholder="e.g., 200"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used to calculate CO2 saved and logistics requirements.</p>
                  </label>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-1.5">Asset Condition (Radio Buttons):</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex items-center gap-1.5">
                      <input type="radio" checked={assetCondition === 'like_new'} onChange={() => setAssetCondition('like_new')} />
                      Like New
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input type="radio" checked={assetCondition === 'gently_used'} onChange={() => setAssetCondition('gently_used')} />
                      Gently Used
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input type="radio" checked={assetCondition === 'minor_repair'} onChange={() => setAssetCondition('minor_repair')} />
                      Needs Minor Repair
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-1.5">Upload Photos (Drag & Drop Area):</p>
                  <label className="block rounded-xl border-2 border-dashed border-[#e5e5e5] bg-[#edf2f4]/30 px-4 py-6 text-center cursor-pointer hover:bg-[#edf2f4]/50">
                    <Camera className="w-5 h-5 text-[#da1a32] mx-auto mb-2" />
                    <span className="text-sm text-gray-700">📷 Drag and drop images here, or browse files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                  {photoFiles.length ? <p className="text-xs text-gray-500 mt-1">{photoFiles.length} photo(s) selected</p> : null}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold text-[#000000] mb-3">Section 2: Logistics & Handoff</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="text-sm text-gray-700">
                    Pickup Location (Dropdown/Text):
                    <input
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="Select registered corporate address or enter new warehouse location"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Available Date for Pickup (Date Picker):
                    <input
                      type="date"
                      value={availablePickupDate}
                      onChange={(e) => setAvailablePickupDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Name:
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Phone:
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+60 1X-XXX XXXX"
                      className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold text-[#000000] mb-3">Section 3: ESG Target Alignment</h4>
                <label className="text-sm text-gray-700 block">
                  Primary Impact Goal (Dropdown):
                  <select
                    value={primaryImpactGoal}
                    onChange={(e) => setPrimaryImpactGoal(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border-2 border-[#e5e5e5] px-3 py-2.5"
                  >
                    <option>SDG 12: Responsible Consumption and Production</option>
                    <option>SDG 4: Quality Education</option>
                    <option>SDG 1: No Poverty</option>
                    <option>SDG 2: Zero Hunger</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which corporate SDG target this specific bulk donation should count toward.
                  </p>
                </label>
              </section>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#e5e5e5] p-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowBulkDonationModal(false)}
                className="px-3.5 py-2 rounded-lg border border-[#e5e5e5] text-sm hover:bg-[#edf2f4]"
              >
                Cancel
              </button>
              <button
                onClick={submitBulkDonation}
                className="px-3.5 py-2 rounded-lg bg-[#da1a32] text-white text-sm font-medium hover:bg-[#b01528]"
              >
                Submit Assets for AI Matching
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
