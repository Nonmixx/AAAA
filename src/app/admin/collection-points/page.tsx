'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPinned, Plus, RefreshCcw, Route } from 'lucide-react';

type WorkflowResponse = {
  activeEvent: { id: string; title: string } | null;
  collectionPoints: Array<{
    id: string;
    name: string;
    type: string;
    address: string | null;
    current_load: number;
    capacity: number | null;
    manager_contact: string | null;
    status: string;
    serving_regions: string[];
  }>;
  routePlans: Array<{ id: string; status: string; summary: string | null; created_at: string }>;
  error?: string;
};

export default function AdminCollectionPointsPage() {
  const [data, setData] = useState<WorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'community_hub',
    address: '',
    capacity: '300',
    managerContact: '',
    servingRegions: 'Shah Alam, Selangor',
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/workflow-center', { cache: 'no-store' });
      const json = (await response.json()) as WorkflowResponse;
      if (!response.ok) throw new Error(json.error || 'Unable to load collection points.');
      setData(json);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load collection points.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createCollectionPoint = async () => {
    setResult(null);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/collection-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          capacity: Number(form.capacity),
          servingRegions: form.servingRegions.split(',').map((item) => item.trim()).filter(Boolean),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to create collection point.');
      setResult(JSON.stringify(json, null, 2));
      setForm({ name: '', type: 'community_hub', address: '', capacity: '300', managerContact: '', servingRegions: 'Shah Alam, Selangor' });
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create collection point.');
    }
  };

  const runRoutePlanning = async () => {
    setResult(null);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/jobs/route-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to run route planning.');
      setResult(JSON.stringify(json, null, 2));
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to run route planning.');
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
          <h1 className="text-3xl font-bold text-[#000000]">Collection Point Management</h1>
          <p className="mt-1 text-sm text-gray-600">Create relief hubs, review load, and trigger route planning from the real frontend workflow.</p>
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
            <Plus className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Add Collection Point</h2>
          </div>
          <div className="space-y-3">
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Shah Alam Main Relief Hub" className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} placeholder="community_hub" className="rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
              <input value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} placeholder="300" className="rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
            </div>
            <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Shah Alam, Selangor" className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.managerContact} onChange={(event) => setForm((current) => ({ ...current, managerContact: event.target.value }))} placeholder="Ops Lead +60123456789" className="rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
              <input value={form.servingRegions} onChange={(event) => setForm((current) => ({ ...current, servingRegions: event.target.value }))} placeholder="Shah Alam, Selangor" className="rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
            </div>
            <button onClick={() => void createCollectionPoint()} className="inline-flex items-center gap-2 rounded-xl bg-[#da1a32] px-4 py-2 text-sm font-medium text-white hover:bg-[#b01528]">
              <MapPinned className="h-4 w-4" />
              Save collection point
            </button>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Route className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Routing</h2>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            With active needs and pending platform allocations in place, this triggers the real route-planning job and writes route plans and stops.
          </p>
          <button onClick={() => void runRoutePlanning()} className="rounded-xl bg-[#000000] px-4 py-2 text-sm font-medium text-white hover:bg-[#da1a32]">
            Run route planning
          </button>
          <div className="mt-6 rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/50 p-4 text-sm text-gray-700">
            Active event: <span className="font-medium text-[#000000]">{loading ? 'Loading...' : data?.activeEvent?.title ?? 'No active event'}</span>
            <br />
            Existing route plans: <span className="font-medium text-[#000000]">{loading ? '-' : data?.routePlans.length ?? 0}</span>
          </div>
        </section>
      </div>

      <section className="mb-6 rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[#000000]">Current Collection Points</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.collectionPoints ?? []).map((point) => (
            <div key={point.id} className="rounded-xl border border-[#e5e5e5] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#000000]">{point.name}</div>
                  <div className="mt-1 text-sm text-gray-600">{point.address ?? 'Address pending'}</div>
                </div>
                <span className="rounded-full bg-[#edf2f4] px-2 py-1 text-xs text-gray-600">{point.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="rounded-full bg-[#edf2f4] px-2 py-1">Load {point.current_load}/{point.capacity ?? 'n/a'}</span>
                <span className="rounded-full bg-[#edf2f4] px-2 py-1">{point.type}</span>
              </div>
              <div className="mt-3 text-xs text-gray-500">Manager: {point.manager_contact ?? 'Not set'}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[#000000]">Last Action Result</h2>
        <pre className="max-h-80 overflow-auto rounded-lg bg-[#000000] p-4 text-xs text-green-200">
          {result ?? 'Create a collection point or run route planning to inspect the live response here.'}
        </pre>
      </section>
    </div>
  );
}
