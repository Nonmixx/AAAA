-- Disaster operations foundation
-- Adds the core incident, intake, routing, equity, and reporting tables
-- required to evolve the current donation marketplace into a disaster
-- response platform.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'disaster_event_status') then
    create type disaster_event_status as enum ('detected', 'review_pending', 'active', 'stabilizing', 'closed', 'suppressed');
  end if;

  if not exists (select 1 from pg_type where typname = 'disaster_activation_mode') then
    create type disaster_activation_mode as enum ('manual', 'auto', 'escalated_auto');
  end if;

  if not exists (select 1 from pg_type where typname = 'platform_mode') then
    create type platform_mode as enum ('normal', 'crisis');
  end if;

  if not exists (select 1 from pg_type where typname = 'incident_source_type') then
    create type incident_source_type as enum ('news', 'nadma', 'social', 'manual', 'webhook');
  end if;

  if not exists (select 1 from pg_type where typname = 'incident_review_status') then
    create type incident_review_status as enum ('pending', 'accepted', 'suppressed', 'duplicate');
  end if;

  if not exists (select 1 from pg_type where typname = 'communication_channel') then
    create type communication_channel as enum ('whatsapp', 'sms', 'email', 'web', 'internal');
  end if;

  if not exists (select 1 from pg_type where typname = 'communication_direction') then
    create type communication_direction as enum ('outbound', 'inbound');
  end if;

  if not exists (select 1 from pg_type where typname = 'campaign_platform') then
    create type campaign_platform as enum ('facebook', 'instagram', 'web', 'internal');
  end if;

  if not exists (select 1 from pg_type where typname = 'collection_assignment_type') then
    create type collection_assignment_type as enum ('dropoff', 'pickup', 'direct_delivery');
  end if;

  if not exists (select 1 from pg_type where typname = 'pickup_status') then
    create type pickup_status as enum ('not_required', 'pending', 'broadcast', 'claimed', 'picked_up', 'cancelled', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'volunteer_task_status') then
    create type volunteer_task_status as enum ('open', 'claimed', 'in_progress', 'completed', 'cancelled', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'route_plan_status') then
    create type route_plan_status as enum ('planned', 'assigned', 'in_progress', 'completed', 'review_required', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'route_stop_status') then
    create type route_stop_status as enum ('pending', 'arrived', 'proof_required', 'completed', 'failed', 'skipped');
  end if;

  if not exists (select 1 from pg_type where typname = 'proof_verification_status') then
    create type proof_verification_status as enum ('pending', 'verified', 'review_required', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type report_status as enum ('queued', 'running', 'completed', 'failed');
  end if;
end $$;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$ language sql stable;

create table if not exists disaster_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  disaster_type text not null,
  status disaster_event_status not null default 'detected',
  severity text not null default 'medium',
  affected_regions text[] not null default '{}'::text[],
  source text,
  activation_mode disaster_activation_mode not null default 'manual',
  auto_confidence numeric(5,4),
  summary text,
  started_at timestamptz,
  ended_at timestamptz,
  activated_at timestamptz,
  activated_by uuid references profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_status (
  status_key text primary key default 'primary',
  mode platform_mode not null default 'normal',
  active_disaster_event_id uuid references disaster_events(id) on delete set null,
  activated_at timestamptz,
  activated_by uuid references profiles(id) on delete set null,
  automation_lock boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into platform_status (status_key, mode)
values ('primary', 'normal')
on conflict (status_key) do nothing;

create table if not exists incident_signals (
  id uuid primary key default gen_random_uuid(),
  source_type incident_source_type not null,
  source_name text not null,
  source_ref text,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_text text not null,
  detected_locations text[] not null default '{}'::text[],
  detected_keywords text[] not null default '{}'::text[],
  confidence_score numeric(5,4) not null default 0,
  review_status incident_review_status not null default 'pending',
  linked_disaster_event_id uuid references disaster_events(id) on delete set null,
  processed_at timestamptz,
  escalation_deadline_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shelter_import_batches (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid references disaster_events(id) on delete set null,
  source_name text not null,
  source_url text,
  import_status text not null default 'pending',
  raw_payload jsonb not null default '{}'::jsonb,
  imported_count integer not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists shelter_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_name text,
  phone text,
  preferred_channel communication_channel not null default 'whatsapp',
  is_primary boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shelter_need_snapshots (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid references disaster_events(id) on delete set null,
  organization_id uuid not null references organizations(id) on delete cascade,
  beneficiary_count integer,
  need_summary jsonb not null default '[]'::jsonb,
  source text not null default 'import',
  confidence_score numeric(5,4),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists communications (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid references disaster_events(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  donation_id uuid references donations(id) on delete set null,
  volunteer_task_id uuid,
  channel communication_channel not null,
  direction communication_direction not null,
  sender_role text,
  recipient text,
  transcript text,
  media_urls text[] not null default '{}'::text[],
  provider_message_id text,
  message_status text not null default 'queued',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaign_posts (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid references disaster_events(id) on delete set null,
  platform campaign_platform not null,
  status text not null default 'draft',
  title text,
  body text not null,
  external_post_id text,
  published_at timestamptz,
  engagement jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists collection_points (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid references disaster_events(id) on delete set null,
  name text not null,
  type text not null default 'community_hub',
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  opening_hours text,
  capacity integer,
  current_load integer not null default 0,
  serving_regions text[] not null default '{}'::text[],
  status text not null default 'active',
  manager_contact text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists collection_assignments (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references donations(id) on delete cascade,
  disaster_event_id uuid references disaster_events(id) on delete set null,
  assignment_type collection_assignment_type not null default 'dropoff',
  collection_point_id uuid references collection_points(id) on delete set null,
  pickup_required boolean not null default false,
  pickup_status pickup_status not null default 'not_required',
  assignment_reason text,
  donor_latitude numeric(10,7),
  donor_longitude numeric(10,7),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists volunteers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete set null,
  name text not null,
  phone text,
  status text not null default 'available',
  home_region text,
  current_latitude numeric(10,7),
  current_longitude numeric(10,7),
  current_capacity_kg numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists volunteer_tasks (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid references disaster_events(id) on delete set null,
  collection_assignment_id uuid references collection_assignments(id) on delete cascade,
  volunteer_id uuid references volunteers(id) on delete set null,
  task_type text not null default 'pickup',
  status volunteer_task_status not null default 'open',
  pickup_address text,
  pickup_latitude numeric(10,7),
  pickup_longitude numeric(10,7),
  notes text,
  expires_at timestamptz,
  claimed_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicle_profiles (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  vehicle_type text not null,
  capacity_kg numeric(10,2),
  capacity_notes text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists route_plans (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid references disaster_events(id) on delete set null,
  volunteer_id uuid references volunteers(id) on delete set null,
  status route_plan_status not null default 'planned',
  started_at timestamptz,
  completed_at timestamptz,
  objective_score numeric(10,4),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists route_stops (
  id uuid primary key default gen_random_uuid(),
  route_plan_id uuid not null references route_plans(id) on delete cascade,
  stop_order integer not null,
  stop_type text not null,
  collection_point_id uuid references collection_points(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  expected_items jsonb not null default '[]'::jsonb,
  expected_quantity integer,
  status route_stop_status not null default 'pending',
  eta_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_plan_id, stop_order)
);

create table if not exists route_allocations (
  id uuid primary key default gen_random_uuid(),
  route_plan_id uuid not null references route_plans(id) on delete cascade,
  route_stop_id uuid references route_stops(id) on delete cascade,
  allocation_id uuid not null references donation_allocations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (route_plan_id, allocation_id)
);

create table if not exists traffic_snapshots (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid references disaster_events(id) on delete set null,
  provider text not null default 'google_maps',
  region text,
  snapshot_payload jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create table if not exists collection_inventory_ledger (
  id uuid primary key default gen_random_uuid(),
  collection_point_id uuid not null references collection_points(id) on delete cascade,
  donation_id uuid references donations(id) on delete set null,
  allocation_id uuid references donation_allocations(id) on delete set null,
  item_name text not null,
  quantity_delta integer not null,
  event_type text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists equity_metrics (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid not null references disaster_events(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  category text not null,
  requested_quantity integer not null default 0,
  fulfilled_quantity integer not null default 0,
  fulfillment_ratio numeric(8,4) not null default 0,
  time_since_last_fulfillment_minutes integer,
  underserved_score numeric(10,4) not null default 0,
  computed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (disaster_event_id, organization_id, category, computed_at)
);

create table if not exists equity_alerts (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid not null references disaster_events(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  category text,
  severity text not null default 'medium',
  alert_type text not null default 'underserved',
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists report_runs (
  id uuid primary key default gen_random_uuid(),
  disaster_event_id uuid not null references disaster_events(id) on delete cascade,
  report_type text not null,
  status report_status not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists report_artifacts (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid not null references report_runs(id) on delete cascade,
  artifact_type text not null,
  file_name text,
  file_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table organizations
  add column if not exists organization_type text default 'ngo',
  add column if not exists shelter_code text,
  add column if not exists capacity integer,
  add column if not exists current_occupancy integer not null default 0,
  add column if not exists contact_person text,
  add column if not exists contact_phone_verified boolean not null default false,
  add column if not exists operational_status text not null default 'active';

alter table needs
  add column if not exists disaster_event_id uuid references disaster_events(id) on delete set null,
  add column if not exists need_type text,
  add column if not exists beneficiary_count integer,
  add column if not exists location_override text,
  add column if not exists priority_score numeric(10,4),
  add column if not exists source text default 'manual';

alter table donations
  add column if not exists source_event_id uuid references disaster_events(id) on delete set null,
  add column if not exists intake_channel communication_channel,
  add column if not exists packaging_type text,
  add column if not exists ready_state text,
  add column if not exists expiry_date date,
  add column if not exists pickup_required boolean not null default false,
  add column if not exists pickup_address text,
  add column if not exists pickup_suitability_score numeric(10,4);

alter table donation_allocations
  add column if not exists disaster_priority_score numeric(10,4),
  add column if not exists underserved_weight numeric(10,4),
  add column if not exists routing_notes jsonb not null default '{}'::jsonb;

alter table delivery_proofs
  add column if not exists proof_verification_status proof_verification_status not null default 'pending',
  add column if not exists verification_confidence numeric(5,4),
  add column if not exists verification_notes text;

alter table notifications
  add column if not exists disaster_event_id uuid references disaster_events(id) on delete set null;

create index if not exists idx_disaster_events_status on disaster_events(status, created_at desc);
create index if not exists idx_incident_signals_review_status on incident_signals(review_status, created_at desc);
create index if not exists idx_incident_signals_event on incident_signals(linked_disaster_event_id);
create index if not exists idx_needs_disaster_event on needs(disaster_event_id, status);
create index if not exists idx_collection_assignments_donation on collection_assignments(donation_id);
create index if not exists idx_volunteer_tasks_status on volunteer_tasks(status, expires_at);
create index if not exists idx_route_plans_status on route_plans(status, created_at desc);
create index if not exists idx_route_stops_plan_order on route_stops(route_plan_id, stop_order);
create index if not exists idx_equity_metrics_event_org on equity_metrics(disaster_event_id, organization_id, computed_at desc);
create index if not exists idx_equity_alerts_event_status on equity_alerts(disaster_event_id, status, created_at desc);
create index if not exists idx_report_runs_event_status on report_runs(disaster_event_id, status, created_at desc);

alter table disaster_events enable row level security;
alter table platform_status enable row level security;
alter table incident_signals enable row level security;
alter table shelter_import_batches enable row level security;
alter table shelter_contacts enable row level security;
alter table shelter_need_snapshots enable row level security;
alter table communications enable row level security;
alter table campaign_posts enable row level security;
alter table collection_points enable row level security;
alter table collection_assignments enable row level security;
alter table volunteers enable row level security;
alter table volunteer_tasks enable row level security;
alter table vehicle_profiles enable row level security;
alter table route_plans enable row level security;
alter table route_stops enable row level security;
alter table route_allocations enable row level security;
alter table traffic_snapshots enable row level security;
alter table collection_inventory_ledger enable row level security;
alter table equity_metrics enable row level security;
alter table equity_alerts enable row level security;
alter table report_runs enable row level security;
alter table report_artifacts enable row level security;

drop policy if exists disaster_events_public_select on disaster_events;
create policy disaster_events_public_select
on disaster_events for select
to anon, authenticated
using (status in ('active', 'stabilizing', 'closed'));

drop policy if exists disaster_events_admin_all on disaster_events;
create policy disaster_events_admin_all
on disaster_events for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists platform_status_public_select on platform_status;
create policy platform_status_public_select
on platform_status for select
to anon, authenticated
using (true);

drop policy if exists platform_status_admin_update on platform_status;
create policy platform_status_admin_update
on platform_status for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists incident_signals_admin_all on incident_signals;
create policy incident_signals_admin_all
on incident_signals for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists shelter_import_batches_admin_all on shelter_import_batches;
create policy shelter_import_batches_admin_all
on shelter_import_batches for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists shelter_contacts_admin_all on shelter_contacts;
create policy shelter_contacts_admin_all
on shelter_contacts for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists shelter_need_snapshots_admin_all on shelter_need_snapshots;
create policy shelter_need_snapshots_admin_all
on shelter_need_snapshots for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists communications_admin_all on communications;
create policy communications_admin_all
on communications for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists campaign_posts_admin_all on campaign_posts;
create policy campaign_posts_admin_all
on campaign_posts for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists collection_points_public_select on collection_points;
create policy collection_points_public_select
on collection_points for select
to anon, authenticated
using (status = 'active');

drop policy if exists collection_points_admin_all on collection_points;
create policy collection_points_admin_all
on collection_points for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists collection_assignments_admin_all on collection_assignments;
create policy collection_assignments_admin_all
on collection_assignments for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists volunteers_admin_all on volunteers;
create policy volunteers_admin_all
on volunteers for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists volunteer_tasks_admin_all on volunteer_tasks;
create policy volunteer_tasks_admin_all
on volunteer_tasks for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists vehicle_profiles_admin_all on vehicle_profiles;
create policy vehicle_profiles_admin_all
on vehicle_profiles for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists route_plans_admin_all on route_plans;
create policy route_plans_admin_all
on route_plans for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists route_stops_admin_all on route_stops;
create policy route_stops_admin_all
on route_stops for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists route_allocations_admin_all on route_allocations;
create policy route_allocations_admin_all
on route_allocations for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists traffic_snapshots_admin_all on traffic_snapshots;
create policy traffic_snapshots_admin_all
on traffic_snapshots for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists collection_inventory_ledger_admin_all on collection_inventory_ledger;
create policy collection_inventory_ledger_admin_all
on collection_inventory_ledger for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists equity_metrics_admin_all on equity_metrics;
create policy equity_metrics_admin_all
on equity_metrics for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists equity_alerts_admin_all on equity_alerts;
create policy equity_alerts_admin_all
on equity_alerts for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists report_runs_admin_all on report_runs;
create policy report_runs_admin_all
on report_runs for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists report_artifacts_admin_all on report_artifacts;
create policy report_artifacts_admin_all
on report_artifacts for all
to authenticated
using (is_admin())
with check (is_admin());
