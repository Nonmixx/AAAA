import { disasterConfig, requireConfig } from '../config';

export type CampaignPostInput = {
  message: string;
  platform: 'facebook' | 'instagram';
};

export async function publishCampaignPost(input: CampaignPostInput) {
  const accessToken = requireConfig(
    disasterConfig.campaigns.metaAccessToken,
    'Set META_ACCESS_TOKEN to enable campaign publishing.',
  );
  const baseUrl = disasterConfig.campaigns.metaGraphApiBase;

  if (input.platform === 'facebook') {
    const pageId = requireConfig(
      disasterConfig.campaigns.facebookPageId,
      'Set META_FACEBOOK_PAGE_ID to enable Facebook publishing.',
    );
    const response = await fetch(`${baseUrl}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input.message,
        access_token: accessToken,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Facebook publish failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  const instagramAccountId = requireConfig(
    disasterConfig.campaigns.instagramAccountId,
    'Set META_INSTAGRAM_ACCOUNT_ID to enable Instagram publishing.',
  );

  // Replace this flow with your preferred Instagram publish pattern if you need media posts.
  const response = await fetch(`${baseUrl}/${instagramAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caption: input.message,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Instagram publish failed: ${response.status} ${text}`);
  }

  return response.json();
}
