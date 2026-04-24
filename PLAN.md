# Disaster Automation Implementation Plan for the Current Product

## Summary
Extend the existing Next.js + Supabase donation platform into a disaster-response workflow by building on what already exists: `organizations`, `needs`, `donations`, `donation_allocations`, `delivery_proofs`, and the existing donor/receiver portals. Ship this in four phases so the product becomes useful early, with automation added only after the core disaster operations are real and observable.

Default direction:
- Keep the current product as the source of truth.
- Treat shelters/disaster-response centers as a specialized kind of `organization`.
- Treat disaster demand as prioritized `needs`, not a separate parallel system at first.
- Use manual/admin-triggered crisis mode first, then add automation later.
- Defer WhatsApp, routing optimization, and autonomous exception handling until the data model and operator workflow are stable.

## Implementation Steps

### Phase 1: Reframe the Current Product for Disaster Operations
1. Add disaster-specific organization metadata.
   - Extend `organizations` with fields for `organization_type`, `disaster_role`, `serves_disaster_area`, `operational_status`, and optional shelter capacity/contact fields.
   - Default `organization_type` to current NGO/receiver behavior so existing flows keep working.

2. Add crisis-specific need metadata.
   - Extend `needs` with `disaster_event_id` nullable foreign key, `need_type`, `beneficiary_count`, `location_override`, `priority_score`, and `source`.
   - Keep existing `urgency`, `is_emergency`, and `published_at`; do not replace them.

3. Introduce a first-class disaster event model.
   - Add `disaster_events` table with `title`, `disaster_type`, `status`, `severity`, `affected_regions`, `started_at`, `ended_at`, `activation_mode`, and `metadata`.
   - Add `system_modes` or a single-row `platform_status` table for global state like `normal` / `crisis`.

4. Build an admin/operator crisis console.
   - New admin-only page to create an event, activate crisis mode, assign affected regions, and mark participating organizations.
   - Show event summary, linked needs, donation volume, and delivery progress.

5. Reuse receiver flows for shelters and relief centers.
   - Keep `receiver/create-needs` as the base workflow.
   - Add a disaster-mode preset so a shelter can quickly post structured needs without filling a fully generic form every time.

### Phase 2: Make Disaster Intake Operational Before Full Automation
1. Create a rapid need intake workflow for disaster responders.
   - Add a “quick intake” form for operators to create multiple needs for one organization in one session.
   - Support common kits: food packs, water, hygiene kits, blankets, medicine, baby supplies.

2. Add structured templates instead of freeform-only requests.
   - Introduce predefined categories and unit labels for disaster items.
   - Pre-fill quantities from beneficiary count when possible, but allow override.

3. Add operator-assisted ingestion from external reports.
   - New ingestion screen where admin pastes a shelter message, article text, or field report.
   - Use the existing AI route pattern to extract candidate needs into structured draft rows.
   - Require human review before publishing.

4. Add event-aware donor browsing.
   - Update donor needs pages so active disaster-event needs sort above normal needs.
   - Add filters for event, location, urgency, and organization type.
   - Keep existing browse pages compatible for non-disaster usage.

5. Add disaster badges and transparency in UI.
   - Mark event-linked needs with event name, region, and “verified by operator” / “reported by organization”.
   - Surface remaining quantity and beneficiary count prominently.

### Phase 3: Upgrade Matching and Allocation from Demo Logic to Real Product Logic
1. Replace demo NGO catalog matching with live database matching.
   - Retire `NGO_DEMAND_CATALOG` as the primary source for donation planning.
   - Match donor items against live `needs` joined to `organizations` and active `disaster_events`.

2. Introduce a matching service layer.
   - Build a server-side matching module that scores candidate needs using:
     - item/category fit
     - urgency
     - disaster-event priority
     - quantity remaining
     - organization operational status
     - distance when pickup/delivery coordinates exist
   - Keep AI as an explainability/enrichment layer, not the only decision-maker.

3. Persist match explanations in existing allocation records.
   - Expand `donation_allocations.match_score`, `match_reason`, and `route_summary` usage.
   - Store enough structured JSON to explain why a donation was routed to a given need.

4. Convert donor confirmation into a real persisted flow.
   - The “Confirm Donation & Proceed” action should create a `donations` row and one or more `donation_allocations` rows.
   - Remove reliance on mock allocation cards in donor UX.

5. Add receiver-side acceptance constraints.
   - Allow receivers/operators to accept or reject allocations based on capacity, timing, and item suitability.
   - Record changes in `donation_events`.

### Phase 4: Add Delivery Coordination and Proof Workflows
1. Make tracking real.
   - Replace `mockDonations` in donor tracking with live joins across `donations`, `donation_allocations`, `delivery_proofs`, and `donation_events`.
   - Show per-allocation status and linked disaster event when present.

2. Add collection/delivery coordination without full route optimization yet.
   - Start with simple scheduled delivery metadata on `donation_allocations` or a new `deliveries` table.
   - Support `dropoff`, `pickup`, `platform_delivery`, `self_delivery`.

3. Add operator-managed delivery assignment.
   - New table for `deliveries` or `delivery_jobs` with assigned volunteer/driver, pickup window, destination, and current status.
   - Do not introduce full multi-stop routing in v1.

4. Strengthen proof-of-delivery.
   - Keep `delivery_proofs` as the artifact store.
   - Add optional proof review status, notes, and operator confirmation for disaster-response auditing.

5. Add simple fairness monitoring.
   - Build a dashboard derived from live data showing:
     - needs by region
     - fulfilled vs requested by event
     - underserved organizations by quantity gap
   - Use deterministic reporting first; AI-generated “equity insights” can be added after the metrics are trusted.

### Phase 5: Add Automation Safely
1. Manual-first crisis activation.
   - Initial v1: admin creates/activates event manually.
   - This is the safest path and fits the current product.

2. Semi-automated report ingestion.
   - Add background polling or operator-uploaded feeds for news/reports later.
   - Store candidate incidents in `incident_signals` with `raw_payload`, `confidence`, `source`, and `review_status`.

3. Human-in-the-loop event promotion.
   - A signal can suggest a new `disaster_event`, but must not auto-publish needs or switch global mode without operator confirmation.

4. External messaging integrations after internal workflow is stable.
   - Add WhatsApp/Twilio only after:
     - event model exists
     - operator dashboard exists
     - need ingestion exists
     - delivery assignment exists
   - First messaging use cases: notify operators, notify receivers, confirm delivery windows.

5. Routing automation last.
   - Only introduce collection points, volunteer routing, rerouting, and exception automation after enough real delivery data exists.
   - These should be separate tables and services, not bolted onto `donation_allocations`.

## Important Interface and Data Changes
- New tables:
  - `disaster_events`
  - `platform_status` or `system_modes`
  - `incident_signals`
  - `delivery_jobs` or `deliveries`
- Table extensions:
  - `organizations`: disaster/shelter metadata
  - `needs`: event linkage, beneficiary count, source, priority fields
  - `donation_allocations`: richer match explanation and scheduling metadata
  - `delivery_proofs`: review/verification metadata
- API additions:
  - `POST /api/disaster-events`
  - `POST /api/disaster-events/:id/activate`
  - `POST /api/disaster-intake/extract`
  - `POST /api/matching/preview`
  - `POST /api/deliveries/:id/status`
- UI additions:
  - operator crisis dashboard
  - quick disaster need intake
  - live donor tracking
  - disaster-aware browse/filter pages

## Test Plan
- Create a disaster event and verify crisis mode badges, event linking, and operator visibility.
- Create disaster needs from the receiver portal and ensure they appear correctly in donor browse results.
- Run AI-assisted extraction from pasted field-report text and verify draft needs require approval before publishing.
- Submit a donor donation and verify live matching uses database needs rather than the hardcoded catalog.
- Accept and reject allocations from the receiver side and confirm `donation_events` are recorded.
- Upload delivery proof and verify donor, receiver, and operator views all reflect the updated status.
- Confirm non-disaster needs and existing donor/receiver flows still work unchanged.
- Verify missing AI keys fall back gracefully without breaking manual disaster operations.

## Assumptions and Defaults
- “Based on current product” means evolve the existing marketplace, not create a separate disaster app.
- Admin/operator workflows are allowed to be introduced even though the current repo is mainly donor/receiver-facing.
- Disaster shelters are modeled as organizations, not a brand-new top-level entity in v1.
- Crisis automation starts manual, not autonomous.
- WhatsApp, external news detection, route optimization, and equity AI are out of the first implementation slice.
- The first production-ready milestone is: create disaster event, publish disaster needs, match real donations to live needs, track delivery with proof.
