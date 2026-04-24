import { disasterConfig, requireConfig } from '../config';

export type NewsSignalCandidate = {
  sourceName: string;
  sourceRef: string;
  title: string;
  content: string;
  publishedAt: string;
};

type UnknownRecord = Record<string, unknown>;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`News source request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

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

function flattenArticleCandidates(payload: unknown): UnknownRecord[] {
  const root = asRecord(payload);
  if (!root) return [];

  const directArrays = [
    root.articles,
    root.items,
    root.posts,
    root.results,
    root.data,
    root.entries,
  ];

  const channelItems = asRecord(root.channel)?.item;
  const rssItems = asRecord(root.rss)?.channel;

  const nestedArrays = [
    asRecord(root.response)?.articles,
    asRecord(root.response)?.results,
    asRecord(root.payload)?.articles,
    asRecord(root.payload)?.items,
    asRecord(root.feed)?.items,
    asRecord(root.feed)?.entries,
    asRecord(root.data)?.articles,
    asRecord(root.data)?.items,
    channelItems,
    asRecord(rssItems)?.item,
  ];

  return [...directArrays, ...nestedArrays]
    .flatMap(asArray)
    .map(asRecord)
    .filter((item): item is UnknownRecord => Boolean(item));
}

function normalizeNewsArticle(article: UnknownRecord, fallbackUrl: string): NewsSignalCandidate | null {
  const title = firstString(article.title, article.headline, article.name);
  const content = firstString(
    article.description,
    article.summary,
    article.content,
    article.body,
    article.excerpt,
    article.snippet,
  );

  if (!title && !content) return null;

  const sourceRef = firstString(
    article.url,
    article.link,
    article.permalink,
    asRecord(article.guid)?._,
  );

  const publishedAt = firstString(
    article.publishedAt,
    article.published_at,
    article.pubDate,
    article.isoDate,
    article.date,
    article.datetime,
  );

  return {
    sourceName: firstString(asRecord(article.source)?.name) ?? 'News feed',
    sourceRef: sourceRef ?? fallbackUrl,
    title: title ?? 'Untitled news signal',
    content: content ?? title ?? '',
    publishedAt: publishedAt ?? new Date().toISOString(),
  };
}

async function fetchConfiguredFeed(sourceName: string, url: string): Promise<NewsSignalCandidate[]> {
  const payload = await fetchJson<unknown>(url);
  const articles = flattenArticleCandidates(payload);
  return articles
    .map((article) => normalizeNewsArticle(article, url))
    .filter((item): item is NewsSignalCandidate => Boolean(item))
    .map((item) => ({ ...item, sourceName: item.sourceName === 'News feed' ? sourceName : item.sourceName }));
}

export async function fetchNewsSignals(): Promise<NewsSignalCandidate[]> {
  const feedUrls = [
    { sourceName: 'Bernama', url: disasterConfig.signals.bernamaFeedUrl },
    { sourceName: 'Malaysiakini', url: disasterConfig.signals.malaysiakiniFeedUrl },
    { sourceName: 'NST', url: disasterConfig.signals.nstFeedUrl },
  ].filter((item): item is { sourceName: string; url: string } => Boolean(item.url));

  const output: NewsSignalCandidate[] = [];

  for (const feed of feedUrls) {
    output.push(...(await fetchConfiguredFeed(feed.sourceName, feed.url)));
  }

  if (!output.length && disasterConfig.signals.newsApiKey) {
    const apiKey = requireConfig(disasterConfig.signals.newsApiKey, 'NEWSAPI_KEY is required.');
    const query =
      'https://newsapi.org/v2/everything?q=("banjir" OR flood OR evacuate OR evacuation OR "relief center" OR PPS OR landslide OR "tanah runtuh") AND (Malaysia OR Selangor OR Johor OR Kelantan OR Terengganu OR Sabah OR Sarawak)&searchIn=title,description&sortBy=publishedAt&pageSize=20';
    const payload = await fetchJson<{ articles?: Array<{ title?: string; description?: string; url?: string; publishedAt?: string }> }>(
      `${query}&apiKey=${encodeURIComponent(apiKey)}`,
    );

    for (const article of payload.articles ?? []) {
      if (!article.title && !article.description) continue;
      output.push({
        sourceName: 'NewsAPI',
        sourceRef: article.url ?? 'newsapi',
        title: article.title ?? 'Untitled news signal',
        content: article.description ?? article.title ?? '',
        publishedAt: article.publishedAt ?? new Date().toISOString(),
      });
    }
  }

  return output;
}
