function readEnv(name) {
    const value = process.env[name]?.trim();
    if (!value)
        return null;
    if (value.startsWith('replace-with-your-'))
        return null;
    return value;
}
export const disasterConfig = {
    zai: {
        apiKey: readEnv('ZAI_API_KEY') ?? readEnv('BIGMODEL_API_KEY'),
        baseUrl: readEnv('ZAI_API_BASE') ?? 'https://open.bigmodel.cn/api/paas/v4',
        model: readEnv('GLM_MODEL') ?? 'glm-4-flash',
    },
    signals: {
        newsApiKey: readEnv('NEWSAPI_KEY'),
        bernamaFeedUrl: readEnv('BERNAMA_FEED_URL'),
        malaysiakiniFeedUrl: readEnv('MALAYSIAKINI_FEED_URL'),
        nstFeedUrl: readEnv('NST_FEED_URL'),
        nadmaAlertsUrl: readEnv('NADMA_ALERTS_URL'),
        socialSignalSourceUrl: readEnv('SOCIAL_SIGNAL_SOURCE_URL'),
    },
    whatsapp: {
        provider: readEnv('WHATSAPP_PROVIDER') ?? 'twilio',
        twilioAccountSid: readEnv('TWILIO_ACCOUNT_SID'),
        twilioAuthToken: readEnv('TWILIO_AUTH_TOKEN'),
        twilioWhatsAppFrom: readEnv('TWILIO_WHATSAPP_FROM'),
    },
    campaigns: {
        metaGraphApiBase: readEnv('META_GRAPH_API_BASE') ?? 'https://graph.facebook.com',
        metaAccessToken: readEnv('META_ACCESS_TOKEN'),
        facebookPageId: readEnv('META_FACEBOOK_PAGE_ID'),
        instagramAccountId: readEnv('META_INSTAGRAM_ACCOUNT_ID'),
    },
    maps: {
        googleMapsApiKey: readEnv('GOOGLE_MAPS_API_KEY'),
        googleGeocodingApiKey: readEnv('GOOGLE_GEOCODING_API_KEY'),
    },
};
export function requireConfig(value, message) {
    if (!value)
        throw new Error(message);
    return value;
}
