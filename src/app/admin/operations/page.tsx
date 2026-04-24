'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, PlayCircle, RefreshCcw, ShieldAlert, XCircle } from 'lucide-react';

type PlatformStatus = {
  mode: 'normal' | 'crisis';
  active_disaster_event_id: string | null;
  automation_lock: boolean;
};

type DisasterEvent = {
  id: string;
  title: string;
  disaster_type: string;
  status: string;
  severity: string;
  affected_regions: string[];
};

type CollectionPoint = {
  id: string;
  name: string;
  status: string;
  current_load: number;
  capacity: number | null;
};

type OverviewResponse = {
  platformStatus: PlatformStatus | null;
  events: DisasterEvent[];
  collectionPoints: CollectionPoint[];
  stats: {
    verifiedShelterContacts: number;
    activeNeedsForEvent: number;
    pendingPlatformAllocationsForEvent: number;
    scheduledPlatformAllocationsForEvent: number;
    routePlans: number;
    communications: number;
  };
  error?: string;
};

type JobResult = {
  title: string;
  status: 'idle' | 'running' | 'success' | 'error';
  payload: unknown;
  lastRunAt?: string;
};

const INITIAL_JOB_RESULT: JobResult = {
  title: '',
  status: 'idle',
  payload: null,
};

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
        ok
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function AdminOperationsPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobResults, setJobResults] = useState<Record<string, JobResult>>({
    ingestPreview: { ...INITIAL_JOB_RESULT, title: 'Signal Ingestion Preview' },
    shelterDryRun: { ...INITIAL_JOB_RESULT, title: 'Shelter Outreach Dry Run' },
    routePlan: { ...INITIAL_JOB_RESULT, title: 'Route Planning' },
    equity: { ...INITIAL_JOB_RESULT, title: 'Equity Recompute' },
  });

  const loadOverview = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/disaster-overview', { cache: 'no-store' });
      const json = (await response.json()) as OverviewResponse;
      if (!response.ok) throw new Error(json.error || 'Unable to load admin operations overview.');
      setOverview(json);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load admin operations overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const activeEvent = useMemo(
    () => overview?.events.find((event) => event.id === overview?.platformStatus?.active_disaster_event_id) ?? null,
    [overview],
  );

  const prerequisites = useMemo(
    () => [
      {
        label: 'Active disaster event',
        ok: Boolean(activeEvent),
        help: activeEvent ? activeEvent.title : 'Create and activate a disaster event first.',
      },
      {
        label: 'Verified shelter contacts',
        ok: (overview?.stats.verifiedShelterContacts ?? 0) > 0,
        help: `${overview?.stats.verifiedShelterContacts ?? 0} verified contact(s) found.`,
      },
      {
        label: 'Active collection points',
        ok: (overview?.collectionPoints.length ?? 0) > 0,
        help: `${overview?.collectionPoints.length ?? 0} active collection point(s) found.`,
      },
      {
        label: 'Disaster-linked active needs',
        ok: (overview?.stats.activeNeedsForEvent ?? 0) > 0,
        help: `${overview?.stats.activeNeedsForEvent ?? 0} active need(s) linked to the active event.`,
      },
      {
        label: 'Pending platform allocations',
        ok:
          (overview?.stats.pendingPlatformAllocationsForEvent ?? 0) > 0 ||
          (overview?.stats.scheduledPlatformAllocationsForEvent ?? 0) > 0,
        help:
          (overview?.stats.pendingPlatformAllocationsForEvent ?? 0) > 0
            ? `${overview?.stats.pendingPlatformAllocationsForEvent ?? 0} pending platform-delivery allocation(s).`
            : (overview?.stats.scheduledPlatformAllocationsForEvent ?? 0) > 0
              ? `${overview?.stats.scheduledPlatformAllocationsForEvent ?? 0} allocation(s) already routed and scheduled.`
              : '0 pending platform-delivery allocation(s).',
      },
    ],
    [activeEvent, overview],
  );

  const setJobState = (key: string, next: Partial<JobResult>) => {
    setJobResults((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...next,
      },
    }));
  };

  const runJob = async (key: string, request: () => Promise<Response>) => {
    setJobState(key, { status: 'running', payload: null });
    try {
      const response = await request();
      const json = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(
          typeof json === 'object' && json && 'error' in json ? String((json as { error: unknown }).error) : 'Job failed.',
        );
      }

      setJobState(key, {
        status: 'success',
        payload: json,
        lastRunAt: new Date().toLocaleString('en-GB'),
      });
      await loadOverview();
    } catch (error) {
      setJobState(key, {
        status: 'error',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' },
        lastRunAt: new Date().toLocaleString('en-GB'),
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/admin/disasters"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#da1a32] hover:text-[#b01528]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to disaster console
          </Link>
          <h1 className="text-3xl font-bold text-[#000000]">Disaster Operations Test Panel</h1>
          <p className="mt-1 text-sm text-gray-600">
            Run the core disaster jobs from the frontend and inspect the JSON results without using the browser console.
          </p>
        </div>
        <button
          onClick={() => void loadOverview()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] transition-colors hover:bg-[#edf2f4]"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh status
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#da1a32]" />
          <h2 className="text-lg font-bold text-[#000000]">Workflow Prerequisites</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {prerequisites.map((item) => (
            <div key={item.label} className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/40 p-4">
              <div className="mb-2">
                <StatusBadge ok={item.ok} label={item.ok ? 'Ready' : 'Missing'} />
              </div>
              <div className="font-semibold text-[#000000]">{item.label}</div>
              <p className="mt-1 text-sm text-gray-600">{loading ? 'Loading...' : item.help}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Current Active Event</h2>
          {activeEvent ? (
            <div className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/40 p-4">
              <p className="text-lg font-semibold text-[#000000]">{activeEvent.title}</p>
              <p className="mt-1 text-sm text-gray-600">
                {activeEvent.disaster_type} · {activeEvent.severity} · {activeEvent.affected_regions.join(', ')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active disaster event yet. Create and activate one in the disaster console.</p>
          )}
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Recommended Test Order</h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li>1. Run Signal Ingestion Preview to confirm feeds are reachable.</li>
            <li>2. Run Shelter Outreach Dry Run to preview WhatsApp messages.</li>
            <li>3. Run Route Planning to create route plans and stops.</li>
            <li>4. Run Equity Recompute to generate fairness metrics and alerts.</li>
          </ol>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#000000]">Run Jobs</h2>
            <span className="text-xs uppercase tracking-wide text-gray-500">Frontend only</span>
          </div>
          <div className="space-y-3">
            <button
              onClick={() =>
                void runJob('ingestPreview', () => fetch('/api/jobs/disaster-signal-ingest?dryRun=1', { method: 'POST' }))
              }
              className="flex w-full items-center justify-between rounded-xl border border-[#e5e5e5] px-4 py-3 text-left transition-colors hover:bg-[#edf2f4]"
            >
              <div>
                <div className="font-semibold text-[#000000]">Signal Ingestion Preview</div>
                <div className="text-sm text-gray-600">Preview external signal connectors without writing records.</div>
              </div>
              <PlayCircle className="h-5 w-5 text-[#da1a32]" />
            </button>

            <button
              onClick={() =>
                void runJob('shelterDryRun', () =>
                  fetch('/api/jobs/shelter-outreach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dryRun: true }),
                  }),
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-[#e5e5e5] px-4 py-3 text-left transition-colors hover:bg-[#edf2f4]"
            >
              <div>
                <div className="font-semibold text-[#000000]">Shelter Outreach Dry Run</div>
                <div className="text-sm text-gray-600">Show the WhatsApp messages that would be sent to shelters.</div>
              </div>
              <PlayCircle className="h-5 w-5 text-[#da1a32]" />
            </button>

            <button
              onClick={() =>
                void runJob('routePlan', () =>
                  fetch('/api/jobs/route-planning', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  }),
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-[#e5e5e5] px-4 py-3 text-left transition-colors hover:bg-[#edf2f4]"
            >
              <div>
                <div className="font-semibold text-[#000000]">Route Planning</div>
                <div className="text-sm text-gray-600">Create route plans and route stops from current allocations.</div>
              </div>
              <PlayCircle className="h-5 w-5 text-[#da1a32]" />
            </button>

            <button
              onClick={() =>
                void runJob('equity', () =>
                  fetch('/api/jobs/equity-recompute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  }),
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-[#e5e5e5] px-4 py-3 text-left transition-colors hover:bg-[#edf2f4]"
            >
              <div>
                <div className="font-semibold text-[#000000]">Equity Recompute</div>
                <div className="text-sm text-gray-600">Recalculate underserved shelters and raise fairness alerts.</div>
              </div>
              <PlayCircle className="h-5 w-5 text-[#da1a32]" />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Latest Results</h2>
          <div className="space-y-4">
            {Object.entries(jobResults).map(([key, result]) => (
              <div key={key} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="font-semibold text-[#000000]">{result.title}</div>
                  <div className="flex items-center gap-2 text-xs">
                    {result.status === 'success' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Success
                      </span>
                    )}
                    {result.status === 'error' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-700">
                        <XCircle className="h-3.5 w-3.5" />
                        Error
                      </span>
                    )}
                    {result.status === 'running' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                        <Clock3 className="h-3.5 w-3.5" />
                        Running
                      </span>
                    )}
                    {result.status === 'idle' && (
                      <span className="rounded-full bg-[#edf2f4] px-2 py-1 text-gray-600">Not run yet</span>
                    )}
                  </div>
                </div>
                {result.lastRunAt ? <p className="mb-2 text-xs text-gray-500">Last run: {result.lastRunAt}</p> : null}
                <pre className="max-h-72 overflow-auto rounded-lg bg-[#000000] p-3 text-xs leading-relaxed text-green-200">
                  {result.payload ? prettyJson(result.payload) : 'No result yet.'}
                </pre>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
