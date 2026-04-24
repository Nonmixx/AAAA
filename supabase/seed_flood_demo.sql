-- Minimal end-to-end flood demo dataset
-- Run this in the Supabase SQL editor after your base schema + disaster migration.
--
-- What this creates:
-- 1. One active flood disaster event
-- 2. Two approved shelter organizations
-- 3. Two verified shelter WhatsApp contacts
-- 4. Two active disaster-linked needs
-- 5. One active collection point with coordinates
-- 6. One donor donation
-- 7. Two pending platform-delivery allocations
--
-- After running this, you can test:
-- - POST /api/jobs/shelter-outreach with {"dryRun": true}
-- - POST /api/jobs/route-planning with {}
-- - POST /api/jobs/equity-recompute with {}

do $$
declare
  admin_profile_id uuid;
  receiver_profile_id uuid;
  donor_profile_id uuid;

  disaster_event_id constant uuid := '11111111-1111-1111-1111-111111111111';
  shelter_org_a_id constant uuid := '22222222-2222-2222-2222-222222222221';
  shelter_org_b_id constant uuid := '22222222-2222-2222-2222-222222222222';
  shelter_contact_a_id constant uuid := '33333333-3333-3333-3333-333333333331';
  shelter_contact_b_id constant uuid := '33333333-3333-3333-3333-333333333332';
  collection_point_id constant uuid := '44444444-4444-4444-4444-444444444441';
  need_a_id constant uuid := '55555555-5555-5555-5555-555555555551';
  need_b_id constant uuid := '55555555-5555-5555-5555-555555555552';
  donation_id constant uuid := '66666666-6666-6666-6666-666666666661';
  allocation_a_id constant uuid := '77777777-7777-7777-7777-777777777771';
  allocation_b_id constant uuid := '77777777-7777-7777-7777-777777777772';
begin
  select id into admin_profile_id
  from profiles
  where role = 'admin'
  order by created_at
  limit 1;

  select id into receiver_profile_id
  from profiles
  where role = 'receiver'
  order by created_at
  limit 1;

  select id into donor_profile_id
  from profiles
  where role = 'donor'
  order by created_at
  limit 1;

  admin_profile_id := coalesce(admin_profile_id, receiver_profile_id, donor_profile_id);
  receiver_profile_id := coalesce(receiver_profile_id, admin_profile_id, donor_profile_id);
  donor_profile_id := coalesce(donor_profile_id, admin_profile_id, receiver_profile_id);

  if admin_profile_id is null or receiver_profile_id is null or donor_profile_id is null then
    raise exception 'seed_flood_demo.sql requires at least one row in profiles. Create/login at least one user first.';
  end if;

  insert into disaster_events (
    id,
    title,
    disaster_type,
    status,
    severity,
    affected_regions,
    source,
    activation_mode,
    auto_confidence,
    summary,
    started_at,
    activated_at,
    activated_by,
    metadata
  )
  values (
    disaster_event_id,
    'Demo Flood in Shah Alam',
    'flood',
    'active',
    'high',
    array['Shah Alam', 'Selangor'],
    'manual_demo',
    'manual',
    null,
    'Seeded flood demo event for outreach, routing, and equity testing.',
    now(),
    now(),
    admin_profile_id,
    jsonb_build_object('seeded', true, 'scenario', 'flood-demo')
  )
  on conflict (id) do update
  set
    title = excluded.title,
    disaster_type = excluded.disaster_type,
    status = excluded.status,
    severity = excluded.severity,
    affected_regions = excluded.affected_regions,
    source = excluded.source,
    activation_mode = excluded.activation_mode,
    summary = excluded.summary,
    started_at = excluded.started_at,
    activated_at = excluded.activated_at,
    activated_by = excluded.activated_by,
    metadata = excluded.metadata,
    updated_at = now();

  insert into platform_status (
    status_key,
    mode,
    active_disaster_event_id,
    activated_at,
    activated_by,
    automation_lock,
    metadata
  )
  values (
    'primary',
    'crisis',
    disaster_event_id,
    now(),
    admin_profile_id,
    false,
    jsonb_build_object('seeded', true, 'scenario', 'flood-demo')
  )
  on conflict (status_key) do update
  set
    mode = excluded.mode,
    active_disaster_event_id = excluded.active_disaster_event_id,
    activated_at = excluded.activated_at,
    activated_by = excluded.activated_by,
    automation_lock = excluded.automation_lock,
    metadata = excluded.metadata,
    updated_at = now();

  insert into organizations (
    id,
    owner_profile_id,
    name,
    registration_number,
    contact_email,
    contact_phone,
    address,
    location_name,
    latitude,
    longitude,
    description,
    verification_status,
    is_emergency,
    emergency_reason,
    shelter_code,
    capacity,
    current_occupancy,
    contact_person,
    contact_phone_verified,
    operational_status
  )
  values
    (
      shelter_org_a_id,
      receiver_profile_id,
      'PPS Seksyen 13',
      'DEMO-PPS-SECTION13',
      'pps13@example.org',
      '+60123000001',
      'Seksyen 13, Shah Alam, Selangor',
      'Shah Alam',
      3.0733000,
      101.5185000,
      'Demo flood shelter with urgent family supply demand.',
      'approved',
      true,
      'Flood evacuation center',
      'PPS-S13',
      350,
      220,
      'Farah Relief Lead',
      true,
      'active'
    ),
    (
      shelter_org_b_id,
      receiver_profile_id,
      'PPS Klang Utama',
      'DEMO-PPS-KLANGUTAMA',
      'ppsklang@example.org',
      '+60123000002',
      'Klang Utama, Klang, Selangor',
      'Klang',
      3.0402000,
      101.4456000,
      'Demo flood shelter with hygiene and bedding demand.',
      'approved',
      true,
      'Flood evacuation center',
      'PPS-KLANG',
      280,
      160,
      'Amir Ops Lead',
      true,
      'active'
    )
  on conflict (id) do update
  set
    owner_profile_id = excluded.owner_profile_id,
    name = excluded.name,
    registration_number = excluded.registration_number,
    contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone,
    address = excluded.address,
    location_name = excluded.location_name,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    description = excluded.description,
    verification_status = excluded.verification_status,
    is_emergency = excluded.is_emergency,
    emergency_reason = excluded.emergency_reason,
    shelter_code = excluded.shelter_code,
    capacity = excluded.capacity,
    current_occupancy = excluded.current_occupancy,
    contact_person = excluded.contact_person,
    contact_phone_verified = excluded.contact_phone_verified,
    operational_status = excluded.operational_status,
    updated_at = now();

  insert into shelter_contacts (
    id,
    organization_id,
    contact_name,
    phone,
    preferred_channel,
    is_primary,
    is_verified
  )
  values
    (
      shelter_contact_a_id,
      shelter_org_a_id,
      'Farah Relief Lead',
      '+60123000001',
      'whatsapp',
      true,
      true
    ),
    (
      shelter_contact_b_id,
      shelter_org_b_id,
      'Amir Ops Lead',
      '+60123000002',
      'whatsapp',
      true,
      true
    )
  on conflict (id) do update
  set
    organization_id = excluded.organization_id,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    preferred_channel = excluded.preferred_channel,
    is_primary = excluded.is_primary,
    is_verified = excluded.is_verified,
    updated_at = now();

  insert into shelter_need_snapshots (
    disaster_event_id,
    organization_id,
    beneficiary_count,
    need_summary,
    source,
    confidence_score
  )
  values
    (
      disaster_event_id,
      shelter_org_a_id,
      220,
      '[{"category":"Food Packs","quantity":120},{"category":"Baby Formula","quantity":40}]'::jsonb,
      'seed_demo',
      1.0
    ),
    (
      disaster_event_id,
      shelter_org_b_id,
      160,
      '[{"category":"Blankets","quantity":80},{"category":"Hygiene Kits","quantity":90}]'::jsonb,
      'seed_demo',
      1.0
    );

  insert into collection_points (
    id,
    disaster_event_id,
    name,
    type,
    address,
    latitude,
    longitude,
    opening_hours,
    capacity,
    current_load,
    serving_regions,
    status,
    manager_contact,
    metadata
  )
  values (
    collection_point_id,
    disaster_event_id,
    'Shah Alam Main Relief Hub',
    'community_hub',
    'Shah Alam Convention Centre, Selangor',
    3.0738000,
    101.5183000,
    '24/7 during flood response',
    1000,
    120,
    array['Shah Alam', 'Klang', 'Selangor'],
    'active',
    'Logistics Team +60129990000',
    jsonb_build_object('seeded', true)
  )
  on conflict (id) do update
  set
    disaster_event_id = excluded.disaster_event_id,
    name = excluded.name,
    type = excluded.type,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    opening_hours = excluded.opening_hours,
    capacity = excluded.capacity,
    current_load = excluded.current_load,
    serving_regions = excluded.serving_regions,
    status = excluded.status,
    manager_contact = excluded.manager_contact,
    metadata = excluded.metadata,
    updated_at = now();

  insert into needs (
    id,
    organization_id,
    created_by_profile_id,
    title,
    description,
    category,
    quantity_requested,
    quantity_fulfilled,
    urgency,
    status,
    is_emergency,
    published_at,
    disaster_event_id,
    need_type,
    beneficiary_count,
    location_override,
    priority_score,
    source
  )
  values
    (
      need_a_id,
      shelter_org_a_id,
      receiver_profile_id,
      '[DEMO FLOOD] Food Packs for Evacuated Families',
      'Immediate demand for dry food packs and family essentials for flood evacuees in PPS Seksyen 13.',
      'Food Packs',
      120,
      10,
      'high',
      'active',
      true,
      now(),
      disaster_event_id,
      'shelter_urgent',
      220,
      'Seksyen 13, Shah Alam',
      0.95,
      'seed_demo'
    ),
    (
      need_b_id,
      shelter_org_b_id,
      receiver_profile_id,
      '[DEMO FLOOD] Hygiene and Bedding Kits',
      'Urgent need for blankets and hygiene kits for displaced families in Klang Utama.',
      'Hygiene Kits',
      90,
      0,
      'high',
      'active',
      true,
      now(),
      disaster_event_id,
      'shelter_urgent',
      160,
      'Klang Utama, Klang',
      0.92,
      'seed_demo'
    )
  on conflict (id) do update
  set
    organization_id = excluded.organization_id,
    created_by_profile_id = excluded.created_by_profile_id,
    title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    quantity_requested = excluded.quantity_requested,
    quantity_fulfilled = excluded.quantity_fulfilled,
    urgency = excluded.urgency,
    status = excluded.status,
    is_emergency = excluded.is_emergency,
    published_at = excluded.published_at,
    disaster_event_id = excluded.disaster_event_id,
    need_type = excluded.need_type,
    beneficiary_count = excluded.beneficiary_count,
    location_override = excluded.location_override,
    priority_score = excluded.priority_score,
    source = excluded.source,
    updated_at = now();

  insert into donations (
    id,
    donor_profile_id,
    item_name,
    category,
    description,
    condition_grade,
    quantity_total,
    source_type,
    status,
    delivery_method,
    pickup_location_text,
    pickup_latitude,
    pickup_longitude,
    ai_match_summary,
    source_event_id,
    pickup_required
  )
  values (
    donation_id,
    donor_profile_id,
    '[DEMO FLOOD] Mixed Relief Supplies',
    'Emergency Supplies',
    'Seeded donor batch to test routing, outreach, and equity flows.',
    'good',
    120,
    'manual',
    'allocated',
    'platform_delivery',
    'Shah Alam Main Relief Hub',
    3.0738000,
    101.5183000,
    jsonb_build_object('seeded', true, 'scenario', 'flood-demo'),
    disaster_event_id,
    false
  )
  on conflict (id) do update
  set
    donor_profile_id = excluded.donor_profile_id,
    item_name = excluded.item_name,
    category = excluded.category,
    description = excluded.description,
    condition_grade = excluded.condition_grade,
    quantity_total = excluded.quantity_total,
    source_type = excluded.source_type,
    status = excluded.status,
    delivery_method = excluded.delivery_method,
    pickup_location_text = excluded.pickup_location_text,
    pickup_latitude = excluded.pickup_latitude,
    pickup_longitude = excluded.pickup_longitude,
    ai_match_summary = excluded.ai_match_summary,
    source_event_id = excluded.source_event_id,
    pickup_required = excluded.pickup_required,
    updated_at = now();

  insert into donation_allocations (
    id,
    donation_id,
    need_id,
    allocated_quantity,
    status,
    delivery_method,
    disaster_priority_score,
    underserved_weight,
    routing_notes
  )
  values
    (
      allocation_a_id,
      donation_id,
      need_a_id,
      70,
      'pending',
      'platform_delivery',
      0.95,
      1.20,
      jsonb_build_object('seeded', true)
    ),
    (
      allocation_b_id,
      donation_id,
      need_b_id,
      50,
      'pending',
      'platform_delivery',
      0.92,
      1.15,
      jsonb_build_object('seeded', true)
    )
  on conflict (id) do update
  set
    donation_id = excluded.donation_id,
    need_id = excluded.need_id,
    allocated_quantity = excluded.allocated_quantity,
    status = excluded.status,
    delivery_method = excluded.delivery_method,
    scheduled_at = null,
    route_summary = null,
    disaster_priority_score = excluded.disaster_priority_score,
    underserved_weight = excluded.underserved_weight,
    routing_notes = excluded.routing_notes,
    updated_at = now();

  raise notice 'Flood demo seeded successfully.';
  raise notice 'Active disaster event id: %', disaster_event_id;
  raise notice 'Collection point id: %', collection_point_id;
  raise notice 'Need ids: %, %', need_a_id, need_b_id;
end $$;
