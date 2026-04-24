import { disasterConfig, requireConfig } from '../config';
export async function fetchSocialSignals() {
    const url = requireConfig(disasterConfig.signals.socialSignalSourceUrl, 'Set SOCIAL_SIGNAL_SOURCE_URL in your environment to enable social signal ingestion.');
    // Replace this with your approved social listening or analytics source.
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok)
        throw new Error(`Social signal request failed: ${response.status}`);
    const payload = (await response.json());
    return (payload.posts ?? [])
        .filter((post) => post.text)
        .map((post) => ({
        sourceName: post.source ?? 'Social signal feed',
        sourceRef: post.url ?? url,
        content: post.text ?? '',
        publishedAt: post.timestamp ?? new Date().toISOString(),
    }));
}
