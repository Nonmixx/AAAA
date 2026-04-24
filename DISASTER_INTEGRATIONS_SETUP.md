# Disaster Integrations Setup

This file shows exactly where you need to replace placeholders with your own APIs or provider credentials.

## 1. Environment variables to fill in

Update `.env.local` using the keys in `.env.example`.

You must replace these with your own values:

- `ZAI_API_KEY`
- `NEWSAPI_KEY`
- `BERNAMA_FEED_URL`
- `MALAYSIAKINI_FEED_URL`
- `NST_FEED_URL`
- `NADMA_ALERTS_URL`
- `SOCIAL_SIGNAL_SOURCE_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `META_ACCESS_TOKEN`
- `META_FACEBOOK_PAGE_ID`
- `META_INSTAGRAM_ACCOUNT_ID`
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_GEOCODING_API_KEY`

## 2. Files where you must replace payload parsing

These files are scaffolded and working as integration boundaries, but the exact payload mapping depends on your real provider response shapes.

### News feeds
- `src/lib/disaster/providers/newsSources.ts`

Replace:
- the JSON response type for each feed
- how article fields are mapped into `title`, `content`, `url`, `publishedAt`

### NADMA alerts
- `src/lib/disaster/providers/nadma.ts`

Replace:
- the NADMA response type
- the alert field mapping

### Social listening
- `src/lib/disaster/providers/socialSignals.ts`

Replace:
- the social listening payload shape
- the mapping from each post into `content`, `url`, `timestamp`

## 3. Files where provider logic is already scaffolded

### WhatsApp sending
- `src/lib/disaster/providers/whatsapp.ts`

Current behavior:
- implemented for Twilio WhatsApp

Replace if needed:
- provider branch if you use Meta WhatsApp Business API instead of Twilio

### WhatsApp webhook
- `src/app/api/webhooks/whatsapp/route.ts`

Current behavior:
- validates Twilio `X-Twilio-Signature` using `TWILIO_AUTH_TOKEN`
- parses Twilio form-encoded webhook payloads

Replace if needed:
- parsing logic for another provider payload shape
- linking inbound messages to shelters, donors, or volunteers

### Facebook / Instagram campaigns
- `src/lib/disaster/providers/campaigns.ts`

Replace if needed:
- the Meta publish flow, especially if your Instagram publishing requires media container creation first

### Maps / geocoding
- `src/lib/disaster/providers/maps.ts`

Current behavior:
- scaffolded for Google Geocoding and Distance Matrix

Replace if needed:
- provider endpoints if you use another routing vendor

## 4. New job endpoints you can trigger

These now exist:

- `POST /api/jobs/disaster-signal-ingest`
- `POST /api/jobs/shelter-outreach`
- `POST /api/jobs/equity-recompute`
- `POST /api/jobs/disaster-detection`
- `POST /api/jobs/route-planning`

Safe previews:
- `POST /api/jobs/disaster-signal-ingest?dryRun=1`
- `POST /api/jobs/shelter-outreach` with `{ "dryRun": true }`

You can hook these up to:
- cron jobs
- Vercel scheduled functions
- GitHub Actions
- an external worker

## 5. Important note about current implementation state

Already scaffolded:
- disaster schema
- admin console
- signal ingestion boundary
- WhatsApp integration boundary
- campaign integration boundary
- maps integration boundary
- equity recompute job
- live need matching fallback for donor assistant

Still not fully built:
- shelter import parser
- volunteer claim workflow
- route optimization
- proof verification pipeline
- reporting generator

## 6. Recommended first replacements

Implement in this order:

1. Fill `.env.local`
2. Replace `newsSources.ts` payload parsing
3. Replace `nadma.ts` payload parsing
4. Configure Twilio sender + signed webhook
5. Test `POST /api/jobs/disaster-signal-ingest`
6. Test `POST /api/jobs/shelter-outreach`
7. Add real route planning after maps credentials are working
