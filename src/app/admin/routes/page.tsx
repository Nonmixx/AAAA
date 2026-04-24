'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';

type RouteStop = {
  id: string;
  stop_order: number;
  status: string;
  address: string | null;
  expected_quantity: number | null;
  eta_at: string | null;
  completed_at: string | null;
  organizations?: { name?: string } | null;
};

type RoutePlan = {
  id: string;
  status: string;
  summary: string | null;
  created_at: string;
  stops: RouteStop[];
};

type ProofRecord = {
  id: string;
  proof_verification_status: string;
  verification_confidence: number | null;
  verification_notes: string | null;
  location_text: string | null;
  proof_timestamp: string;
  donation?: { item_name?: string } | null;
  need?: { title?: string } | null;
  organization?: { name?: string } | null;
};

type WorkflowResponse = {
  routePlans: RoutePlan[];
  proofs: ProofRecord[];
  error?: string;
};

export default function AdminRoutesPage() {
  const [data, setData] = useState<WorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/workflow-center', { cache: 'no-store' });
      const json = (await response.json()) as WorkflowResponse;
      if (!response.ok) throw new Error(json.error || 'Unable to load route operations.');
      setData(json);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load route operations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateStopStatus = async (stopId: string, status: string) => {
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/admin/route-stops/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to update route stop.');
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update route stop.');
    }
  };

  const verifyProof = async (proofId: string, status: 'verified' | 'review_required' | 'rejected') => {
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/admin/proofs/${proofId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, confidence: status === 'verified' ? 0.95 : 0.4 }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to verify proof.');
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify proof.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/admin/disasters" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#da1a32]">
            <ArrowLeft className="h-4 w-4" />
            Back to disaster console
          </Link>
          <h1 className="text-3xl font-bold text-[#000000]">Routes & Proof Verification</h1>
          <p className="mt-1 text-sm text-gray-600">Operate delivery routes, update stop progress, and verify uploaded proof from one workflow screen.</p>
        </div>
        <button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] hover:bg-[#edf2f4]">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {errorMessage && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Route Plans</h2>
          </div>
          <div className="space-y-4">
            {(data?.routePlans ?? []).map((plan) => (
              <div key={plan.id} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#000000]">{plan.summary ?? `Route ${plan.id.slice(0, 8)}`}</div>
                    <div className="mt-1 text-xs text-gray-500">{new Date(plan.created_at).toLocaleString('en-GB')}</div>
                  </div>
                  <span className="rounded-full bg-[#edf2f4] px-2 py-1 text-xs text-gray-600">{plan.status}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {plan.stops.map((stop) => (
                    <div key={stop.id} className="rounded-lg border border-[#e5e5e5] bg-[#edf2f4]/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-[#000000]">Stop {stop.stop_order}: {stop.organizations?.name ?? stop.address ?? 'Unknown destination'}</div>
                          <div className="mt-1 text-sm text-gray-600">{stop.address ?? 'Address pending'}</div>
                          <div className="mt-1 text-xs text-gray-500">Expected quantity: {stop.expected_quantity ?? 0} | ETA: {stop.eta_at ? new Date(stop.eta_at).toLocaleString('en-GB') : 'n/a'}</div>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-600">{stop.status}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => void updateStopStatus(stop.id, 'arrived')} className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-xs font-medium text-[#000000] hover:bg-[#edf2f4]">Mark arrived</button>
                        <button onClick={() => void updateStopStatus(stop.id, 'proof_required')} className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-xs font-medium text-[#000000] hover:bg-[#edf2f4]">Request proof</button>
                        <button onClick={() => void updateStopStatus(stop.id, 'completed')} className="rounded-lg bg-[#da1a32] px-3 py-2 text-xs font-medium text-white hover:bg-[#b01528]">Complete stop</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!loading && !(data?.routePlans.length) && <div className="rounded-xl border border-[#e5e5e5] p-4 text-sm text-gray-500">No route plans yet.</div>}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Proof Queue</h2>
          </div>
          <div className="space-y-4">
            {(data?.proofs ?? []).map((proof) => (
              <div key={proof.id} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#000000]">{proof.organization?.name ?? 'Unknown organization'}</div>
                    <div className="mt-1 text-sm text-gray-600">{proof.donation?.item_name ?? proof.need?.title ?? 'Donation proof'}</div>
                    <div className="mt-1 text-xs text-gray-500">{new Date(proof.proof_timestamp).toLocaleString('en-GB')} | {proof.location_text ?? 'Location pending'}</div>
                  </div>
                  <span className="rounded-full bg-[#edf2f4] px-2 py-1 text-xs text-gray-600">{proof.proof_verification_status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => void verifyProof(proof.id, 'verified')} className="inline-flex items-center gap-2 rounded-lg bg-[#da1a32] px-3 py-2 text-xs font-medium text-white hover:bg-[#b01528]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verify
                  </button>
                  <button onClick={() => void verifyProof(proof.id, 'review_required')} className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-xs font-medium text-[#000000] hover:bg-[#edf2f4]">Needs review</button>
                  <button onClick={() => void verifyProof(proof.id, 'rejected')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100">Reject</button>
                </div>
                {proof.verification_notes && <p className="mt-2 text-xs text-gray-500">{proof.verification_notes}</p>}
              </div>
            ))}
            {!loading && !(data?.proofs.length) && <div className="rounded-xl border border-[#e5e5e5] p-4 text-sm text-gray-500">No delivery proofs uploaded yet.</div>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-[#da1a32]" />
          <h2 className="text-lg font-bold text-[#000000]">Workflow Notes</h2>
        </div>
        <p className="text-sm leading-relaxed text-gray-700">
          This page now acts as the volunteer and logistics execution surface in the web app: route plans are visible here, stop progress can be advanced here, and proof verification now writes back to the real delivery tables.
        </p>
      </section>
    </div>
  );
}
