'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BellRing, Radio, RefreshCcw, ShieldAlert, Waves } from 'lucide-react';

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
  auto_confidence: number | null;
  created_at: string;
};

type IncidentSignal = {
  id: string;
  source_type: string;
  source_name: string;
  normalized_text: string;
  detected_locations: string[];
  detected_keywords: string[];
  confidence_score: number;
  review_status: string;
  created_at: string;
};

type EquityAlert = {
  id: string;
  message: string;
  severity: string;
  status: string;
  created_at: string;
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
  signals: IncidentSignal[];
  equityAlerts: EquityAlert[];
  collectionPoints: CollectionPoint[];
  error?: string;
};

const SIGNAL_SOURCES = ['news', 'nadma', 'social', 'manual', 'webhook'] as const;

export default function AdminDisasterConsolePage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    disasterType: 'flood',
    severity: 'high',
    affectedRegions: 'Shah Alam, Selangor',
    summary: '',
  });
  const [signalForm, setSignalForm] = useState({
    sourceType: 'news',
    sourceName: 'Bernama',
    normalizedText: 'Flood warning issued for Shah Alam after sustained rainfall and evacuations to PPS sites.',
    detectedLocations: 'Shah Alam, Selangor',
  });

  const loadOverview = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/disaster-overview', { cache: 'no-store' });
      const json = (await response.json()) as OverviewResponse;
      if (!response.ok) throw new Error(json.error || 'Unable to load admin overview.');
      setOverview(json);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load admin overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const activeEvent = useMemo(
    () => overview?.events.find((event) => event.id === overview.platformStatus?.active_disaster_event_id) ?? null,
    [overview],
  );

  const submitEvent = async () => {
    setBusyAction('event');
    setErrorMessage(null);
    setJobResult(null);
    try {
      const response = await fetch('/api/disaster-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          affectedRegions: eventForm.affectedRegions
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Unable to create disaster event.');
      setEventForm({
        title: '',
        disasterType: 'flood',
        severity: 'high',
        affectedRegions: 'Shah Alam, Selangor',
        summary: '',
      });
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create disaster event.');
    } finally {
      setBusyAction(null);
    }
  };

  const submitSignal = async () => {
    setBusyAction('signal');
    setErrorMessage(null);
    setJobResult(null);
    try {
      const response = await fetch('/api/incident-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: signalForm.sourceType,
          sourceName: signalForm.sourceName,
          normalizedText: signalForm.normalizedText,
          detectedLocations: signalForm.detectedLocations
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Unable to ingest incident signal.');
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to ingest incident signal.');
    } finally {
      setBusyAction(null);
    }
  };

  const runSweep = async () => {
    setBusyAction('sweep');
    setErrorMessage(null);
    setJobResult(null);
    try {
      const response = await fetch('/api/jobs/disaster-detection', { method: 'POST' });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Unable to run detection sweep.');
      setJobResult(JSON.stringify(json, null, 2));
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to run detection sweep.');
    } finally {
      setBusyAction(null);
    }
  };

  const runExternalSignalIngest = async (dryRun: boolean) => {
    setBusyAction(dryRun ? 'ingest-preview' : 'ingest-run');
    setErrorMessage(null);
    setJobResult(null);
    try {
      const response = await fetch(`/api/jobs/disaster-signal-ingest${dryRun ? '?dryRun=1' : ''}`, {
        method: 'POST',
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Unable to run disaster signal ingest.');
      setJobResult(JSON.stringify(json, null, 2));
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to run disaster signal ingest.');
    } finally {
      setBusyAction(null);
    }
  };

  const activateEvent = async (eventId: string) => {
    setBusyAction(eventId);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/disaster-events/${eventId}/activate`, { method: 'POST' });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Unable to activate disaster event.');
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to activate disaster event.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      {overview?.platformStatus?.mode === 'crisis' && activeEvent ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#da1a32]">Crisis Mode Active</div>
          <div className="mt-1 text-lg font-bold text-[#000000]">{activeEvent.title}</div>
          <p className="mt-1 text-sm text-gray-700">
            The platform is currently prioritizing disaster workflows for {activeEvent.affected_regions.join(', ') || 'the active region'}.
          </p>
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#000000]">Disaster Command Console</h1>
          <p className="mt-1 text-sm text-gray-600">
            Incident intake, crisis activation, and the first disaster-automation control surface.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/shelters"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] transition-colors hover:bg-[#edf2f4]"
          >
            Shelter Ops
          </Link>
          <Link
            href="/admin/collection-points"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] transition-colors hover:bg-[#edf2f4]"
          >
            Collection Points
          </Link>
          <Link
            href="/admin/routes"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] transition-colors hover:bg-[#edf2f4]"
          >
            Routes & Proof
          </Link>
          <Link
            href="/admin/reporting"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] transition-colors hover:bg-[#edf2f4]"
          >
            Reporting
          </Link>
          <Link
            href="/admin/operations"
            className="inline-flex items-center gap-2 rounded-xl border border-[#da1a32] bg-white px-4 py-2 text-sm font-medium text-[#da1a32] transition-colors hover:bg-[#da1a32] hover:text-white"
          >
            Open Test Panel
          </Link>
          <button
            onClick={() => void loadOverview()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-medium text-[#000000] transition-colors hover:bg-[#edf2f4]"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
            <Waves className="h-5 w-5 text-[#da1a32]" />
          </div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Platform Mode</div>
          <div className="mt-1 text-2xl font-bold text-[#000000]">
            {loading ? '-' : overview?.platformStatus?.mode ?? 'normal'}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2f4]">
            <BellRing className="h-5 w-5 text-[#000000]" />
          </div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Recent Signals</div>
          <div className="mt-1 text-2xl font-bold text-[#000000]">{loading ? '-' : overview?.signals.length ?? 0}</div>
        </div>

        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2f4]">
            <ShieldAlert className="h-5 w-5 text-[#000000]" />
          </div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Active Event</div>
          <div className="mt-1 text-sm font-semibold text-[#000000]">
            {loading ? '-' : activeEvent?.title ?? 'No active disaster event'}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Equity Alerts</div>
          <div className="mt-1 text-2xl font-bold text-[#000000]">
            {loading ? '-' : overview?.equityAlerts.length ?? 0}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#000000]">Create Disaster Event</h2>
            <button
              onClick={() => void submitEvent()}
              disabled={busyAction === 'event'}
              className="rounded-xl bg-[#da1a32] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b01528] disabled:opacity-50"
            >
              {busyAction === 'event' ? 'Creating...' : 'Create'}
            </button>
          </div>

          <div className="space-y-4">
            <input
              value={eventForm.title}
              onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Flood in Shah Alam"
              className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={eventForm.disasterType}
                onChange={(event) => setEventForm((prev) => ({ ...prev, disasterType: event.target.value }))}
                placeholder="flood"
                className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
              />
              <input
                value={eventForm.severity}
                onChange={(event) => setEventForm((prev) => ({ ...prev, severity: event.target.value }))}
                placeholder="high"
                className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
              />
            </div>
            <input
              value={eventForm.affectedRegions}
              onChange={(event) => setEventForm((prev) => ({ ...prev, affectedRegions: event.target.value }))}
              placeholder="Shah Alam, Selangor"
              className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
            />
            <textarea
              value={eventForm.summary}
              onChange={(event) => setEventForm((prev) => ({ ...prev, summary: event.target.value }))}
              placeholder="Summary for operators and dashboards"
              rows={4}
              className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
            />
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#000000]">Ingest Incident Signal</h2>
            <button
              onClick={() => void submitSignal()}
              disabled={busyAction === 'signal'}
              className="rounded-xl border border-[#da1a32] px-4 py-2 text-sm font-medium text-[#da1a32] transition-colors hover:bg-[#da1a32] hover:text-white disabled:opacity-50"
            >
              {busyAction === 'signal' ? 'Saving...' : 'Save signal'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                value={signalForm.sourceType}
                onChange={(event) => setSignalForm((prev) => ({ ...prev, sourceType: event.target.value }))}
                className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
              >
                {SIGNAL_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <input
                value={signalForm.sourceName}
                onChange={(event) => setSignalForm((prev) => ({ ...prev, sourceName: event.target.value }))}
                placeholder="Bernama"
                className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
              />
            </div>
            <input
              value={signalForm.detectedLocations}
              onChange={(event) => setSignalForm((prev) => ({ ...prev, detectedLocations: event.target.value }))}
              placeholder="Shah Alam, Selangor"
              className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
            />
            <textarea
              value={signalForm.normalizedText}
              onChange={(event) => setSignalForm((prev) => ({ ...prev, normalizedText: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3"
            />
            <button
              onClick={() => void runSweep()}
              disabled={busyAction === 'sweep'}
              className="inline-flex items-center gap-2 rounded-xl bg-[#000000] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#da1a32] disabled:opacity-50"
            >
              <Radio className="h-4 w-4" />
              {busyAction === 'sweep' ? 'Running sweep...' : 'Run detection sweep'}
            </button>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void runExternalSignalIngest(true)}
                disabled={busyAction === 'ingest-preview'}
                className="rounded-xl border border-[#da1a32] px-4 py-2 text-sm font-medium text-[#da1a32] transition-colors hover:bg-[#da1a32] hover:text-white disabled:opacity-50"
              >
                {busyAction === 'ingest-preview' ? 'Previewing...' : 'Preview external feeds'}
              </button>
              <button
                onClick={() => void runExternalSignalIngest(false)}
                disabled={busyAction === 'ingest-run'}
                className="rounded-xl bg-[#da1a32] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b01528] disabled:opacity-50"
              >
                {busyAction === 'ingest-run' ? 'Running ingest...' : 'Run external ingest'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Recent Disaster Events</h2>
          <div className="space-y-4">
            {(overview?.events ?? []).map((event) => (
              <div key={event.id} className="rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#000000]">{event.title}</h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600">{event.status}</span>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-[#da1a32]">{event.severity}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {event.disaster_type} - {event.affected_regions.join(', ') || 'Region pending'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Confidence: {event.auto_confidence ? `${Math.round(event.auto_confidence * 100)}%` : 'manual'}
                    </p>
                  </div>
                  {event.status !== 'active' && (
                    <button
                      onClick={() => void activateEvent(event.id)}
                      disabled={busyAction === event.id}
                      className="rounded-xl border border-[#da1a32] px-3 py-2 text-sm font-medium text-[#da1a32] transition-colors hover:bg-[#da1a32] hover:text-white disabled:opacity-50"
                    >
                      {busyAction === event.id ? 'Activating...' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!loading && !overview?.events.length && (
              <p className="text-sm text-gray-500">No disaster events created yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Recent Signals</h2>
          <div className="space-y-3">
            {(overview?.signals ?? []).map((signal) => (
              <div key={signal.id} className="rounded-xl border border-[#e5e5e5] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#edf2f4] px-2 py-0.5 text-xs text-gray-600">{signal.source_type}</span>
                  <span className="text-xs font-medium text-[#da1a32]">{Math.round(signal.confidence_score * 100)}%</span>
                </div>
                <p className="mt-2 text-sm font-medium text-[#000000]">{signal.source_name}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-600">{signal.normalized_text}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {signal.detected_keywords.map((keyword) => (
                    <span key={`${signal.id}-${keyword}`} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-[#da1a32]">
                      {keyword}
                    </span>
                  ))}
                  {!signal.detected_keywords.length && (
                    <span className="rounded-full bg-[#edf2f4] px-2 py-0.5 text-[11px] text-gray-500">No keywords</span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-gray-500">
                  {signal.detected_locations.join(', ') || 'No locations'} - {signal.review_status}
                </p>
              </div>
            ))}
            {!loading && !overview?.signals.length && (
              <p className="text-sm text-gray-500">No signals ingested yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Equity Alerts</h2>
          <div className="space-y-3">
            {(overview?.equityAlerts ?? []).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-sm font-medium text-[#000000]">{alert.message}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {alert.severity} - {alert.status} - {new Date(alert.created_at).toLocaleString('en-GB')}
                </p>
              </div>
            ))}
            {!loading && !overview?.equityAlerts.length && (
              <p className="text-sm text-gray-500">No equity alerts yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Collection Points</h2>
          <div className="space-y-3">
            {(overview?.collectionPoints ?? []).map((point) => (
              <div key={point.id} className="rounded-xl border border-[#e5e5e5] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-[#000000]">{point.name}</p>
                  <span className="rounded-full bg-[#edf2f4] px-2 py-0.5 text-xs text-gray-600">{point.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  Load {point.current_load}
                  {point.capacity ? ` / ${point.capacity}` : ''}
                </p>
              </div>
            ))}
            {!loading && !overview?.collectionPoints.length && (
              <p className="text-sm text-gray-500">No collection points configured yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[#000000]">Last Detection Action</h2>
        <pre className="max-h-80 overflow-auto rounded-lg bg-[#000000] p-4 text-xs text-green-200">
          {jobResult ?? 'Run a detection sweep or external ingest to inspect the structured response here.'}
        </pre>
      </section>
    </div>
  );
}
