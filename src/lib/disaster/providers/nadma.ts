import { disasterConfig, requireConfig } from '../config';

export type NadmaAlertCandidate = {
  sourceName: string;
  sourceRef: string;
  title: string;
  content: string;
  publishedAt: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function flattenAlertCandidates(payload: unknown): UnknownRecord[] {
  const root = asRecord(payload);
  if (!root) return [];

  return [
    root.alerts,
    root.data,
    root.items,
    root.results,
    root.posts,
    asRecord(root.response)?.alerts,
    asRecord(root.response)?.data,
    asRecord(root.payload)?.alerts,
    asRecord(root.payload)?.items,
  ]
    .flatMap(asArray)
    .map(asRecord)
    .filter((item): item is UnknownRecord => Boolean(item));
}

function normalizeAlert(alert: UnknownRecord, fallbackUrl: string): NadmaAlertCandidate | null {
  const title = firstString(alert.title, alert.headline, alert.subject, alert.name);
  const content = firstString(
    alert.summary,
    alert.description,
    alert.message,
    alert.content,
    alert.body,
    alert.text,
  );

  if (!title && !content) return null;

  return {
    sourceName: firstString(alert.sourceName, asRecord(alert.source)?.name) ?? 'NADMA',
    sourceRef: firstString(alert.url, alert.link, alert.permalink) ?? fallbackUrl,
    title: title ?? 'NADMA alert',
    content: content ?? title ?? '',
    publishedAt:
      firstString(alert.publishedAt, alert.published_at, alert.timestamp, alert.created_at, alert.date) ??
      new Date().toISOString(),
  };
}

export async function fetchNadmaAlerts(): Promise<NadmaAlertCandidate[]> {
  const url = requireConfig(
    disasterConfig.signals.nadmaAlertsUrl,
    'Set NADMA_ALERTS_URL in your environment to enable NADMA ingestion.',
  );

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`NADMA request failed: ${response.status}`);

  const payload = (await response.json()) as unknown;
  return flattenAlertCandidates(payload)
    .map((alert) => normalizeAlert(alert, url))
    .filter((item): item is NadmaAlertCandidate => Boolean(item));
}
