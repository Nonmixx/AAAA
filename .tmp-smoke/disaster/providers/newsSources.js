import { disasterConfig, requireConfig } from '../config';
async function fetchJson(url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`News source request failed: ${response.status}`);
    }
    return (await response.json());
}
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function firstString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return null;
}
function flattenArticleCandidates(payload) {
    const root = asRecord(payload);
    if (!root)
        return [];
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
        .filter((item) => Boolean(item));
}
function normalizeNewsArticle(article, fallbackUrl) {
    const title = firstString(article.title, article.headline, article.name);
    const content = firstString(article.description, article.summary, article.content, article.body, article.excerpt, article.snippet);
    if (!title && !content)
        return null;
    const sourceRef = firstString(article.url, article.link, article.permalink, asRecord(article.guid)?._);
    const publishedAt = firstString(article.publishedAt, article.published_at, article.pubDate, article.isoDate, article.date, article.datetime);
    return {
        sourceName: firstString(asRecord(article.source)?.name) ?? 'News feed',
        sourceRef: sourceRef ?? fallbackUrl,
        title: title ?? 'Untitled news signal',
        content: content ?? title ?? '',
        publishedAt: publishedAt ?? new Date().toISOString(),
    };
}
async function fetchConfiguredFeed(sourceName, url) {
    const payload = await fetchJson(url);
    const articles = flattenArticleCandidates(payload);
    return articles
        .map((article) => normalizeNewsArticle(article, url))
        .filter((item) => Boolean(item))
        .map((item) => ({ ...item, sourceName: item.sourceName === 'News feed' ? sourceName : item.sourceName }));
}
export async function fetchNewsSignals() {
    const feedUrls = [
        { sourceName: 'Bernama', url: disasterConfig.signals.bernamaFeedUrl },
        { sourceName: 'Malaysiakini', url: disasterConfig.signals.malaysiakiniFeedUrl },
        { sourceName: 'NST', url: disasterConfig.signals.nstFeedUrl },
    ].filter((item) => Boolean(item.url));
    const output = [];
    for (const feed of feedUrls) {
        output.push(...(await fetchConfiguredFeed(feed.sourceName, feed.url)));
    }
    if (!output.length && disasterConfig.signals.newsApiKey) {
        const apiKey = requireConfig(disasterConfig.signals.newsApiKey, 'NEWSAPI_KEY is required.');
        const query = 'https://newsapi.org/v2/everything?q=(flood OR banjir OR evacuate OR PPS) AND Malaysia&language=en&sortBy=publishedAt&pageSize=20';
        const payload = await fetchJson(`${query}&apiKey=${encodeURIComponent(apiKey)}`);
        for (const article of payload.articles ?? []) {
            if (!article.title && !article.description)
                continue;
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
