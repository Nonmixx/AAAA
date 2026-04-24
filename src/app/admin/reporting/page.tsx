'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Megaphone, RefreshCcw, ScrollText, ShieldAlert } from 'lucide-react';

type WorkflowResponse = {
  activeEvent: { id: string; title: string } | null;
  campaignPosts: Array<{ id: string; platform: string; status: string; body: string; published_at: string | null }>;
  equityAlerts: Array<{ id: string; message: string; severity: string; status: string; created_at: string }>;
  equityMetrics: Array<{ id: string; category: string; organization_id: string; fulfillment_ratio: number; underserved_score: number }>;
  reportRuns: Array<{ id: string; report_type: string; status: string; created_at: string; summary: Record<string, unknown> }>;
  error?: string;
};

export default function AdminReportingPage() {
  const [data, setData] = useState<WorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    platform: 'facebook',
    title: '',
    body: 'Flood response is active. We urgently need food packs, blankets, and hygiene kits for affected shelters. Donate now through DonateAI.',
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/workflow-center', { cache: 'no-store' });
      const json = (await response.json()) as WorkflowResponse;
      if (!response.ok) throw new Error(json.error || 'Unable to load reporting.');
      setData(json);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load reporting.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const publishCampaign = async () => {
    setResult(null);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/campaign-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to publish campaign.');
      setResult(JSON.stringify(json, null, 2));
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to publish campaign.');
    }
  };

  const generateReport = async () => {
    setResult(null);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/reporting/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to generate report.');
      setResult(JSON.stringify(json, null, 2));
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to generate report.');
    }
  };

  const highestRiskMetrics = useMemo(
    () => [...(data?.equityMetrics ?? [])].sort((a, b) => b.underserved_score - a.underserved_score).slice(0, 5),
    [data],
  );

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/admin/disasters" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#da1a32]">
            <ArrowLeft className="h-4 w-4" />
            Back to disaster console
          </Link>
          <h1 className="text-3xl font-bold text-[#000000]">Reporting & Campaigns</h1>
          <p className="mt-1 text-sm text-gray-600">Publish live Facebook appeals, monitor equity risk, and generate real post-crisis summary runs.</p>
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
            <Megaphone className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Publish Campaign Post</h2>
          </div>
          <div className="space-y-3">
            <select value={campaignForm.platform} onChange={(event) => setCampaignForm((current) => ({ ...current, platform: event.target.value }))} className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3">
              <option value="facebook">facebook</option>
            </select>
            <input value={campaignForm.title} onChange={(event) => setCampaignForm((current) => ({ ...current, title: event.target.value }))} placeholder="Urgent flood appeal" className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
            <textarea value={campaignForm.body} onChange={(event) => setCampaignForm((current) => ({ ...current, body: event.target.value }))} rows={5} className="w-full rounded-xl border-2 border-[#e5e5e5] px-4 py-3" />
            <button onClick={() => void publishCampaign()} className="rounded-xl bg-[#da1a32] px-4 py-2 text-sm font-medium text-white hover:bg-[#b01528]">
              Publish to Facebook
            </button>
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Generate Summary Report</h2>
          </div>
          <p className="mb-4 text-sm text-gray-600">This creates a real `report_runs` row using the current disaster workload, route, proof, and equity counts.</p>
          <button onClick={() => void generateReport()} className="rounded-xl bg-[#000000] px-4 py-2 text-sm font-medium text-white hover:bg-[#da1a32]">
            Generate report run
          </button>
          <div className="mt-6 rounded-xl border border-[#e5e5e5] bg-[#edf2f4]/50 p-4 text-sm text-gray-700">
            Active event: <span className="font-medium text-[#000000]">{loading ? 'Loading...' : data?.activeEvent?.title ?? 'No active event'}</span>
          </div>
        </section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#da1a32]" />
            <h2 className="text-lg font-bold text-[#000000]">Equity Alerts</h2>
          </div>
          <div className="space-y-3">
            {(data?.equityAlerts ?? []).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <div className="font-medium text-[#000000]">{alert.message}</div>
                <div className="mt-1 text-xs text-gray-600">{alert.severity} - {alert.status} - {new Date(alert.created_at).toLocaleString('en-GB')}</div>
              </div>
            ))}
            {!loading && !(data?.equityAlerts.length) && <div className="rounded-xl border border-[#e5e5e5] p-4 text-sm text-gray-500">No equity alerts right now.</div>}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Highest Underserved Categories</h2>
          <div className="space-y-3">
            {highestRiskMetrics.map((metric) => (
              <div key={metric.id} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="font-medium text-[#000000]">{metric.category}</div>
                <div className="mt-1 text-sm text-gray-600">Fulfillment ratio: {(metric.fulfillment_ratio * 100).toFixed(0)}%</div>
                <div className="mt-1 text-xs text-gray-500">Underserved score: {metric.underserved_score.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Published Campaigns</h2>
          <div className="space-y-3">
            {(data?.campaignPosts ?? []).map((post) => (
              <div key={post.id} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-[#edf2f4] px-2 py-1 text-xs text-gray-600">{post.platform}</span>
                  <span className="text-xs text-gray-500">{post.published_at ? new Date(post.published_at).toLocaleString('en-GB') : post.status}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-700">{post.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[#000000]">Report Runs</h2>
          <div className="space-y-3">
            {(data?.reportRuns ?? []).map((report) => (
              <div key={report.id} className="rounded-xl border border-[#e5e5e5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-[#000000]">{report.report_type}</div>
                  <span className="rounded-full bg-[#edf2f4] px-2 py-1 text-xs text-gray-600">{report.status}</span>
                </div>
                <pre className="mt-3 overflow-auto rounded-lg bg-[#000000] p-3 text-xs text-green-200">{JSON.stringify(report.summary, null, 2)}</pre>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[#000000]">Last Action Result</h2>
        <pre className="max-h-80 overflow-auto rounded-lg bg-[#000000] p-4 text-xs text-green-200">
          {result ?? 'Publish a campaign or generate a report to inspect the live response here.'}
        </pre>
      </section>
    </div>
  );
}
