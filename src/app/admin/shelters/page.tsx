'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquareMore, Radio, RefreshCcw, Send, Waves } from 'lucide-react';

type WorkflowResponse = {
  activeEvent: { id: string; title: string } | null;
  shelters: Array<{
    id: string;
    organization_id: string;
    contact_name: string | null;
    phone: string | null;
    is_verified: boolean;
    activeNeedCount: number;
    latestInboundCommunication: { id: string; transcript: string | null; created_at: string } | null;
    organization: {
      name: string;
      address: string | null;
      operational_status: string;
      current_occupancy: number | null;
      capacity: number | null;
    } | null;
  }>;
  communications: Array<{
    id: string;
    organization_id: string | null;
    direction: string;
    transcript: string | null;
    recipient: string | null;
    created_at: string;
    metadata?: { promotedNeedId?: string | null } | null;
  }>;
  needs: Array<{
    id: string;
    organization_id: string;
    title: string;
    category: string;
    quantity_requested: number;
    quantity_fulfilled: number;
    urgency: 'low' | 'medium' | 'high';
    source: string | null;
    organizations?: { name?: string; address?: string | null } | null;
  }>;
  stats: {
    verifiedShelterContacts: number;
    inboundMessages: number;
    outboundMessages: number;
    activeNeeds: number;
  };
  error?: string;
};

export default function AdminSheltersPage() {
  const [data, setData] = useState<WorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [promoteForm, setPromoteForm] = useState({
    communicationId: '',
    title: '',
    category: 'food',
    quantityRequested: '50',
    urgency: 'high',
    beneficiaryCount: '',
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/workflow-center', { cache: 'no-store' });
      const json = (await response.json()) as WorkflowResponse;
      if (!response.ok) throw new Error(json.error || 'Unable to load shelter operations.');
      setData(json);
      setPromoteForm((current) => ({
        ...current,
        communicationId:
          current.communicationId ||
          json.communications.find((item) => item.direction === 'inbound')?.id ||
          '',
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load shelter operations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const inboundCommunications = useMemo(
    () => (data?.communications ?? []).filter((item) => item.direction === 'inbound'),
    [data],
  );

  const runOutreach = async (dryRun: boolean) => {
    setResult(null);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/jobs/shelter-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to run shelter outreach.');
      setResult(JSON.stringify(json, null, 2));
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to run shelter outreach.');
    }
  };

  const promoteCommunication = async () => {
    setResult(null);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/communications/promote-need', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...promoteForm,
          quantityRequested: Number(promoteForm.quantityRequested),
          beneficiaryCount: promoteForm.beneficiaryCount ? Number(promoteForm.beneficiaryCount) : null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to promote shelter message.');
      setResult(JSON.stringify(json, null, 2));
      setPromoteForm((current) => ({ ...current, title: '', quantityRequested: '50', beneficiaryCount: '' }));
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to promote shelter message.');
    }
  };

  const autofillFromCommunication = async (communicationId: string) => {
    setResult(null);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/communications/extract-need', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communicationId }),
      });
      const json = (await response.json()) as {
        error?: string;
        suggestion?: {
          title: string;
          category: string;
          quantityRequested: number;
          urgency: 'low' | 'medium' | 'high';
          beneficiaryCount: number | null;
          confidence: number;
          rationale: string[];
        };
      };
      if (!response.ok || !json.suggestion) throw new Error(json.error || 'Unable to extract need suggestion.');

      setPromoteForm((current) => ({
        ...current,
        communicationId,
        title: json.suggestion?.title ?? current.title,
        category: json.suggestion?.category ?? current.category,
        quantityRequested: String(json.suggestion?.quantityRequested ?? current.quantityRequested),
        urgency: json.suggestion?.urgency ?? current.urgency,
        beneficiaryCount: json.suggestion?.beneficiaryCount ? String(json.suggestion.beneficiaryCount) : '',
      }));
      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to extract need suggestion.');
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
          <h1 className="text-3xl font-bold text-[#000000]">Shelter Operations</h1>
          <p className="mt-1 text-sm text-gray-600">
            Send real outreach, watch inbound WhatsApp replies, and convert shelter messages into active disaster needs.
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] hover:bg-[#edf2f4]"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {errorMessage && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Active Event</div>
          <div className="mt-2 text-lg font-bold text-[#000000]">{loading ? '-' : data?.activeEvent?.title ?? 'No active event'}</div>
        </div>
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Verified Contacts</div>
          <div className="mt-2 text-3xl font-bold text-[#000000]">{loading ? '-' : data?.stats.verifiedShelterContacts ?? 0}</div>
        </div>
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Inbound Messages</div>
          <div className="mt-2 text-3xl font-bold text-[#000000]">{loading ? '-' : data?.stats.inboundMessages ?? 0}</div>
        </div>
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Published Needs</div>
          <div className="mt-2 text-3xl font-bold text-[#000000]">{loading ? '-' : data?.stats.activeNeeds ?? 0}</div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Waves className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Shelter Outreach</h2>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Use the real Twilio flow from the frontend. Dry run previews the messages; Send Outreach performs the actual outbound WhatsApp send.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => void runOutreach(true)} className="rounded-xl border border-[#da1a32] px-4 py-2 text-sm font-medium text-[#da1a32] hover:bg-[#da1a32] hover:text-white">
              Preview Outreach
            </button>
            <button onClick={() => void runOutreach(false)} className="rounded-xl bg-[#da1a32] px-4 py-2 text-sm font-medium text-white hover:bg-[#b01528]">
              Send Outreach
            </button>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareMore className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Promote Reply To Need</h2>
          </div>
          <div className="space-y-3">
            <select
              value={promoteForm.communicationId}
              onChange={(event) => setPromoteForm((current) => ({ ...current, communicationId: event.target.value }))}
              className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
            >
              <option value="">Select an inbound reply</option>
              {inboundCommunications.map((communication) => (
                <option key={communication.id} value={communication.id}>
                  {new Date(communication.created_at).toLocaleString('en-GB')} - {(communication.transcript ?? '').slice(0, 60)}
                </option>
              ))}
            </select>
            <input value={promoteForm.title} onChange={(event) => setPromoteForm((current) => ({ ...current, title: event.target.value }))} placeholder="Emergency rice packs for PPS hall" className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
            <div className="grid gap-3 md:grid-cols-3">
              <input value={promoteForm.category} onChange={(event) => setPromoteForm((current) => ({ ...current, category: event.target.value }))} placeholder="food" className="rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
              <input value={promoteForm.quantityRequested} onChange={(event) => setPromoteForm((current) => ({ ...current, quantityRequested: event.target.value }))} placeholder="50" className="rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
              <select value={promoteForm.urgency} onChange={(event) => setPromoteForm((current) => ({ ...current, urgency: event.target.value }))} className="rounded-xl border-2 border-[#e5e5e5] px-4 py-3">
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </div>
            <input
              value={promoteForm.beneficiaryCount}
              onChange={(event) => setPromoteForm((current) => ({ ...current, beneficiaryCount: event.target.value }))}
              placeholder="Estimated beneficiaries"
              className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
            />
            <button onClick={() => void promoteCommunication()} className="inline-flex items-center gap-2 rounded-xl bg-[#000000] px-4 py-2 text-sm font-medium text-white hover:bg-[#da1a32]">
              <Radio className="h-4 w-4" />
              Promote to active need
            </button>
          </div>
        </section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Shelter Directory</h2>
          <div className="space-y-4">
            {(data?.shelters ?? []).map((shelter) => (
              <div key={shelter.id} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#000000]">{shelter.organization?.name ?? 'Unknown shelter'}</div>
                    <div className="mt-1 text-sm text-gray-600">{shelter.contact_name ?? 'Unnamed contact'} - {shelter.phone ?? 'No phone'}</div>
                    <div className="mt-1 text-xs text-gray-500">{shelter.organization?.address ?? 'Address pending'}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${shelter.is_verified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
                    {shelter.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="rounded-full bg-[#edf2f4] px-2 py-1">Needs: {shelter.activeNeedCount}</span>
                  <span className="rounded-full bg-[#edf2f4] px-2 py-1">Occupancy: {shelter.organization?.current_occupancy ?? 0}/{shelter.organization?.capacity ?? 'n/a'}</span>
                  <span className="rounded-full bg-[#edf2f4] px-2 py-1">Status: {shelter.organization?.operational_status ?? 'unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Recent Inbound Replies</h2>
          <div className="space-y-4">
            {inboundCommunications.map((communication) => (
              <div key={communication.id} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#edf2f4] px-2 py-1 text-xs text-gray-600">{communication.recipient ?? 'Unknown sender'}</span>
                    {communication.metadata?.promotedNeedId ? (
                      <span className="rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">Promoted to need</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800">Awaiting promotion</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{new Date(communication.created_at).toLocaleString('en-GB')}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{communication.transcript ?? 'No transcript available.'}</p>
                <button
                  onClick={() => void autofillFromCommunication(communication.id)}
                  disabled={Boolean(communication.metadata?.promotedNeedId)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#da1a32] px-3 py-2 text-xs font-medium text-[#da1a32] hover:bg-[#da1a32] hover:text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  {communication.metadata?.promotedNeedId ? 'Already promoted' : 'Auto-fill promote form'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mb-6 rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#000000]">Published Live Needs</h2>
            <p className="mt-1 text-sm text-gray-600">
              This is the Stage 2 output: structured needs published from shelter replies and now visible to the rest of the platform.
            </p>
          </div>
          <Link href="/receiver/disaster-ops" className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] hover:bg-[#edf2f4]">
            Open receiver disaster view
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.needs ?? []).map((need) => (
            <div key={need.id} className="rounded-xl border border-[#e5e5e5] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#000000]">{need.title}</div>
                  <div className="mt-1 text-sm text-gray-600">{need.organizations?.name ?? 'Shelter'} • {need.category}</div>
                </div>
                <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-[#da1a32]">{need.urgency}</span>
              </div>
              <div className="mt-3 text-sm text-gray-700">{need.quantity_fulfilled} / {need.quantity_requested} fulfilled</div>
              <div className="mt-2 text-xs text-gray-500">
                Source: {need.source === 'communication_promoted' ? 'Shelter reply promoted' : need.source ?? 'manual'}
              </div>
            </div>
          ))}
          {!loading && !(data?.needs?.length) && (
            <div className="rounded-xl border border-[#e5e5e5] p-4 text-sm text-gray-500">
              No published disaster needs yet. Promote a shelter reply to create the live need record.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[#000000]">Last Action Result</h2>
        <pre className="max-h-80 overflow-auto rounded-lg bg-[#000000] p-4 text-xs text-green-200">
          {result ?? 'Run outreach or promote a message to inspect the live API response here.'}
        </pre>
      </section>
    </div>
  );
}
