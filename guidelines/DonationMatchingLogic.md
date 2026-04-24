# Donation Matching Logic

This document explains how the current AI donation assistant matches donor items to live receiver needs.

## Purpose

The matching system does two related jobs:

1. Suggest likely receiver matches during chat before photo verification.
2. Produce a final allocation plan after the donor photo passes screening.

Both flows are grounded in live Supabase `needs` records whenever possible.

## Main Files

- `src/lib/disaster/liveDonationMatching.ts`
- `src/app/api/donation-assistant/chat/route.ts`
- `src/app/api/donation-assistant/plan/route.ts`
- `src/app/pages/donor/AIDonation.tsx`

## End-to-End Flow

### 1. Donor describes items in chat

The donor assistant sends the recent donor transcript plus detected item category to:

- `POST /api/donation-assistant/chat`

That route calls:

- `getLiveMatchedReceivers(transcript, detectedItem)`

If live Supabase data is available, it returns the top live receiver suggestions.
If live data is unavailable, the route falls back to the static catalog matcher.

### 2. Donor uploads a photo

The photo is screened first:

- `POST /api/donation-assistant/analyze-image`

If the image is valid and the item condition is acceptable, the client requests the final plan:

- `POST /api/donation-assistant/plan`

That route now:

1. Pulls scored live need candidates from Supabase.
2. Sends those live need candidates to GLM.
3. Asks GLM to allocate percentage shares across `needId` values only.
4. Converts the chosen live needs back into the UI `PlanReceiver` shape.

If live needs are unavailable or GLM fails, it falls back safely.

## Live Matching Source

The live matcher reads from the Supabase `needs` table and joins:

- `organizations`
- `disaster_events`

Only active needs are considered.

Current query constraints:

- `status = 'active'`
- newest rows first
- up to 80 needs fetched for scoring

## Core Scoring Logic

The main scoring function is:

- `scoreNeedForDonation(row, blob, condition)`

It builds a lowercase text blob from:

- donor transcript
- detected item
- need title
- need description
- need category
- organization name and metadata
- disaster event title and type

### Score Inputs

Each live need gains score from a combination of:

- Remaining quantity: `quantity_requested - quantity_fulfilled`
- Need urgency: `high`, `medium`, `low`
- Emergency flags on the need or organization
- Linked disaster event status
- Linked disaster event severity
- Generic keyword overlap between donor text and the need text
- Category-specific boosts for common donation types

### Category-Specific Boosts

The scorer gives extra weight when donor text aligns with these patterns:

- Food: `food`, `rice`, `meal`, `canned`, `water`, `ration`
- Bedding: `blanket`, `bedding`, `mattress`, `sleep`
- Medical / hygiene: `medical`, `medicine`, `mask`, `health`, `hygiene`, `soap`, `sanitary`, `diaper`
- Education: `book`, `school`, `education`, `stationery`, `kit`
- Clothing: `cloth`, `clothes`, `shirt`, `jacket`, `wear`, `shoe`

### Condition Penalties

Item condition affects live scoring:

- `Worn` gets a penalty for sensitive need types like medical / sterile / baby formula contexts.
- `Damaged` gets a strong penalty.

## Candidate Extraction

The reusable function:

- `getLiveNeedMatchCandidates(transcript, detectedItem, condition, limit)`

returns the highest-scored live need candidates with enough detail for downstream planning.

Each candidate includes:

- `needId`
- `organizationId`
- organization name and location
- category
- need title and description
- remaining quantity
- urgency
- emergency / disaster context
- heuristic score
- human-readable reasons

## Delivery Preference

The donor assistant now exposes a delivery choice in the UI:

- `self_delivery`
- `platform_delivery`

This preference is passed into:

- `POST /api/donation-assistant/chat`
- `POST /api/donation-assistant/plan`

It currently affects:

- assistant guidance wording
- structured plan wording
- GLM logistics reasoning

It does not yet persist a final allocation record by itself inside this assistant flow. That would require wiring the final confirmation button to a donation creation endpoint.

This is the shared source for both:

- live chat suggestions
- final GLM planning

## Chat-Time Matching

For conversational guidance, the chat route uses:

- `getLiveMatchedReceivers(...)`

That function:

1. Gets ranked live need candidates.
2. Picks up to 2 distinct organizations.
3. Converts them into `PlanReceiver` rows.
4. Assigns a split using score-weighted percentages.

### Percentage Split Rules

The allocation helper:

- `allocatePercents(matches)`

computes a score-based split and clamps the top share:

- minimum top share: `55%`
- maximum top share: `80%`

If there is only one match, it gets `100%`.

## Final GLM Planning

After photo approval, the planning route uses live need candidates first.

The route sends GLM a JSON block containing only live Supabase need candidates and instructs it to:

- reason over those live needs only
- allocate across valid `needId` values only
- explain why each share was chosen

The expected GLM output shape is:

```json
{
  "donorIntent": "...",
  "ngoDemandCheck": "...",
  "urgencyEvaluation": "...",
  "allocation": [
    {
      "needId": "uuid",
      "percent": 60,
      "urgency": "High",
      "reasoningBullets": ["...", "**Why this share:** ..."]
    }
  ],
  "planSummary": "..."
}
```

The route then:

1. Validates each returned `needId` against the live candidate set.
2. Normalizes percentages to sum to 100.
3. Converts results into `PlanReceiver[]`.

## Fallback Layers

There are still two fallback layers by design.

### Fallback 1: Live heuristic fallback

If GLM is unavailable or fails, the planner falls back to:

- `getLiveMatchedReceivers(...)`

This still uses live Supabase needs.

### Fallback 2: Static catalog fallback

If live Supabase needs are unavailable, the app falls back to the old catalog-based matcher:

- `src/app/lib/match-donation-ngos.ts`
- `src/app/lib/ngos-demand-catalog.ts`

This keeps the experience functional in demo or degraded environments.

## Current Output Shape Used by the UI

The UI expects `PlanReceiver` rows shaped like:

- `ngoId`
- `name`
- `location`
- `allocation`
- `percent`
- `urgency`
- `reason`
- `matchContext`

For live matching, `ngoId` currently stores the selected `needId`, not the organization id.
This is intentional in the current flow because the detail link is need-driven.

## Design Notes

- Live needs are the source of truth for matching.
- GLM is used as a planner over candidate needs, not as the source of truth itself.
- Heuristic scoring narrows the search space before GLM reasoning.
- The catalog matcher remains only as a resilience fallback.

## Maintenance Guidance

If we update matching behavior later, prefer this order:

1. Update `liveDonationMatching.ts` scoring rules.
2. Update the GLM prompt in `plan/route.ts` if output requirements change.
3. Keep `PlanReceiver` stable unless the UI also changes.
4. Preserve fallback behavior for environments without Supabase or GLM.
