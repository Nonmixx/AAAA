# Disaster Demo Plan

## Goal
Scope the disaster-response product down to a strong live demo that highlights automation and AI, without trying to complete the full operations platform.

The demo should prove five things clearly:
- the system can detect and activate a disaster workflow
- the system can gather shelter demand through automated outreach
- AI can help turn messy field input into structured operational data
- donors can be matched against live disaster needs instead of a static demo catalog
- operators can see routing, fairness, and reporting outputs from real data

## Demo Story
1. A disaster signal is ingested from news / NADMA / social input.
2. The platform creates or promotes a disaster event and switches into crisis mode.
3. Shelters receive WhatsApp outreach automatically.
4. Shelter replies are captured and converted into live needs with AI-assisted structuring.
5. A donor submits item details and photo through the existing assistant.
6. The donor is matched to live disaster needs using deterministic scoring plus GLM reasoning.
7. The system generates a simple route / dispatch view for platform deliveries.
8. Equity metrics show which shelters are underserved.
9. Operators generate a lightweight post-crisis summary report.

## What We Keep

### 1. Disaster command layer
Keep this in demo scope because it anchors the entire workflow.

- `disaster_events` as the top-level incident record
- `platform_status` for `normal` / `crisis` mode
- admin disaster console for signals, event activation, shelters, routes, equity, and reporting
- server-side job boundaries for detection, outreach, routing, equity recompute, and report generation

### 2. Stage 1: Disaster detection
Keep this because it is one of the strongest automation moments in the demo.

- `incident_signals` table
- ingestion connectors for:
  - news
  - NADMA
  - social-signal feed
- deterministic signal scoring
- optional GLM summarization / explanation of signals
- auto-creation of `disaster_event` in `review_pending`
- admin notification
- auto-activation after SLA timeout
- manual admin activation override

Demo outcome:
- show that a raw external signal becomes a structured disaster event with confidence and escalation logic

### 3. Stage 2: Needs mapping
Keep only the parts that create a convincing shelter-operations loop.

- disaster shelter modeling on `organizations`
- `shelter_contacts`
- `communications`
- outbound WhatsApp shelter outreach
- inbound WhatsApp message capture
- AI-assisted extraction from shelter replies into structured fields
- publish extracted needs into live `needs`
- shelter operations admin page showing:
  - contacts
  - inbound replies
  - promoted / published needs

For demo, this is enough:
- text replies must work
- voice-note transcription is optional only if already easy to wire
- auto-publish may be simplified to:
  - high-confidence -> publish directly
  - otherwise -> operator confirms from admin UI

Demo outcome:
- show that shelters are contacted automatically and their messy replies become live needs

### 4. Stage 3: Donation intake
Keep the AI-heavy donor experience because it is central to the product pitch.

- existing web donor assistant
- image screening / item condition check
- live need matching against Supabase `needs`
- GLM allocation reasoning over live need candidates
- structured outputs useful for demo:
  - item category
  - quantity
  - packaging / readiness if easy
  - delivery preference
- persist donation plus allocation when donor confirms

For demo, this is enough:
- web donor flow only
- no WhatsApp donor intake required
- no advanced ambiguity loop beyond current assistant behavior

Demo outcome:
- show that donor items are routed to live disaster demand, not a hardcoded NGO list

### 5. Stage 4: Collection point assignment
Keep only the minimal automation needed to bridge donor intake to logistics.

- `collection_points`
- simple collection-point management UI
- assignment logic that chooses:
  - nearest / active collection point for standard dropoff
  - platform delivery path when needed
- persist assignment reason

For demo, simplify aggressively:
- no volunteer claim marketplace
- no pickup broadcast workflow
- no first-accepted-wins logic

Demo outcome:
- show that the system can make an operational handoff decision after donor intake

### 6. Stage 5: Routing
Keep a lightweight version because route generation is visually strong in demos.

- `route_plans`
- `route_stops`
- `route_allocations`
- simple route-planning job using:
  - active needs
  - accepted / pending platform-delivery allocations
  - collection point location
  - map travel estimates
- admin route page showing:
  - route plan
  - stop order
  - status progression

For demo, simplify to:
- one collection point to multiple shelters
- deterministic nearest-stop ordering is enough
- no volunteer capacity balancing
- no advanced traffic snapshots
- no inventory ledger dependency

Demo outcome:
- show that live needs and allocations can produce a credible delivery route

### 7. Stage 6: Equity enforcement
Keep this because it is a strong “responsible automation” differentiator.

- `equity_metrics`
- `equity_alerts`
- deterministic underserved-score calculation
- admin dashboard visibility for underserved shelters
- optional campaign appeal generation using live unmet categories

For demo, required behavior:
- compute underserved score from requested vs fulfilled quantities
- show alerts and top underserved shelters

Nice-to-have only:
- feeding equity score back into routing and matching

Demo outcome:
- show that the system is not only optimizing speed, but also fairness

### 8. Stage 7: Post-crisis reporting
Keep only a lightweight report generator.

- `report_runs`
- operational summary generation from live counts:
  - active needs
  - allocations
  - routes
  - proofs if available
  - equity alerts
  - communications
- reporting UI showing generated summaries

For demo, this is enough:
- JSON-backed summary or simple dashboard card
- no PDF / CSV export required
- no regulator packet generation required
- no recommendation engine required unless already cheap to add

Demo outcome:
- show that the platform closes the loop with measurable outputs

## What We Cut
These are intentionally out of demo scope because they add complexity without improving the core story enough.

### Cut entirely
- full shelter import / PPS scraping pipeline
- duplicate-event merge workflow
- false-positive suppression sophistication beyond basic admin handling
- donor WhatsApp intake flow
- volunteer pickup claim workflow
- `volunteers` marketplace behavior
- `vehicle_profiles`
- advanced traffic snapshots
- collection inventory ledger / stock reconciliation
- proof and accountability automation as a major subsystem
- AI proof verification
- GPS / timestamp proof validation
- donor proof-linked impact notifications
- regulator-grade report artifacts
- report artifact export pipeline
- recommendation engine for future disasters
- donor / volunteer wrap-up messaging

### Optional only if already almost done
- voice-note transcription
- automated campaign publishing to Facebook / Instagram
- equity-aware appeal generation
- matching / routing weight adjustments from equity score

## Minimal Data Model For Demo

### Required
- `disaster_events`
- `platform_status`
- `incident_signals`
- `communications`
- `shelter_contacts`
- `campaign_posts` only if campaign publishing is demoed
- `collection_points`
- `route_plans`
- `route_stops`
- `route_allocations`
- `equity_metrics`
- `equity_alerts`
- `report_runs`

### Keep from existing core
- `organizations`
- `needs`
- `donations`
- `donation_allocations`
- `notifications`

### Can remain unused in demo
- `collection_assignments`
- `volunteers`
- `volunteer_tasks`
- `vehicle_profiles`
- `traffic_snapshots`
- `collection_inventory_ledger`
- `report_artifacts`
- advanced `delivery_proofs` flows

## Demo-First Delivery Order
1. Disaster command layer and admin console
2. Detection ingestion, scoring, and crisis activation
3. Shelter outreach and inbound communication capture
4. AI-assisted need publishing from shelter replies
5. Live donor matching and persisted donation confirmation
6. Collection point assignment and simple route planning
7. Equity metrics and dashboard alerts
8. Lightweight reporting summary

## Demo Acceptance Criteria

### Detection
- a signal can be ingested manually or from a configured connector
- the platform shows confidence, locations, and detected disaster keywords
- a disaster event can be activated and crisis mode becomes visible

### Shelter operations
- shelters can receive automated outreach
- inbound replies are stored in `communications`
- a shelter reply can become an active `need`
- operators can show that needs now reflect live field input

### Donor flow
- donor assistant uses live disaster needs as primary matching source
- GLM explains why a donation is split across selected needs
- donor confirmation persists the donation and allocation

### Logistics
- a collection point can be created and used
- route planning produces at least one route with ordered stops
- admin UI shows stop progression

### Equity
- underserved shelters appear in dashboard metrics
- at least one equity alert is generated from live data

### Reporting
- operators can generate one summary run from current disaster data
- the report shows enough counts to close the demo story

## Demo Principles
- automation and AI should be visible in every major step
- deterministic logic remains the system of record
- human override is allowed, but the default path should feel automated
- anything that requires too much real-world operational hardening is out of scope
- if a feature does not improve the live demo narrative, cut it

## Final Demo Pitch
This demo is not “full disaster operations.” It is a focused automation showcase:
- detect a crisis
- activate the platform
- collect live shelter demand
- use AI to structure field input
- match donors to real needs
- generate a delivery plan
- monitor fairness
- produce a report

That is enough to demonstrate the product vision without spending time on lower-value operational edge cases.
