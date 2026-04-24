
-- Supabase / PostgreSQL bootstrap
create extension if not exists "pgcrypto";
-- Enums
create type app_role as enum ('donor', 'receiver', 'corporate', 'admin');
create type verification_status as enum ('pending', 'approved', 'rejected');
create type urgency_level as enum ('low', 'medium', 'high');
create type condition_grade as enum ('good', 'worn', 'damaged');
create type donation_status as enum ('draft', 'matching', 'allocated', 'completed', 'cancelled');
create type allocation_status as enum (
  'pending',
  'accepted',
  'scheduled',
  'in_transit',
  'delivered',
  'proof_uploaded',
  'confirmed',
  'rejected',
  'cancelled'
);
create type delivery_method as enum ('platform_delivery', 'self_delivery', 'pickup');
create type ai_message_role as enum ('user', 'bot');
create type ai_message_type as enum ('text', 'image', 'analysis');
-- Updated-at helper
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;




-- Core users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  role app_role not null default 'donor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  language text not null default 'English',
  emergency_mode_view boolean not null default false,
  allocation_completed boolean not null default true,
  delivery_scheduled boolean not null default true,
  item_delivered boolean not null default true,
  proof_of_delivery boolean not null default true,
  emergency_mode_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);




-- Receiver organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  registration_number text not null unique,
  contact_email text not null,
  contact_phone text,
  address text,
  location_name text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  description text,
  verification_status verification_status not null default 'pending',
  is_emergency boolean not null default false,
  emergency_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner', 'manager', 'member')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);
create table organization_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  uploaded_by_profile_id uuid references profiles(id) on delete set null,
  document_type text not null,
  file_name text not null,
  file_url text not null,
  mime_type text,
  file_size_bytes bigint,
  review_status verification_status not null default 'pending',
  reviewed_by_profile_id uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);




-- Needs posted by receiver orgs
create table needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by_profile_id uuid references profiles(id) on delete set null,
  title text not null,
  image_url text,
  description text not null,
  category text not null,
  quantity_requested integer not null check (quantity_requested > 0),
  quantity_fulfilled integer not null default 0 check (quantity_fulfilled >= 0),
  urgency urgency_level not null default 'medium',
  status text not null default 'active' check (status in ('draft', 'active', 'fulfilled', 'cancelled', 'archived')),
  is_emergency boolean not null default false,
  needed_by date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);



-- AI donation assistant
create table ai_donation_sessions (
  id uuid primary key default gen_random_uuid(),
  donor_profile_id uuid not null references profiles(id) on delete cascade,
  detected_item text,
  condition_grade condition_grade,
  stage text not null default 'greeting',
  status text not null default 'open' check (status in ('open', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table ai_donation_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_donation_sessions(id) on delete cascade,
  role ai_message_role not null,
  message_type ai_message_type not null default 'text',
  text text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);



-- Donor donations
create table donations (
  id uuid primary key default gen_random_uuid(),
  donor_profile_id uuid not null references profiles(id) on delete cascade,
  ai_session_id uuid references ai_donation_sessions(id) on delete set null,
  item_name text not null,
  category text,
  description text,
  condition_grade condition_grade not null default 'good',
  quantity_total integer not null check (quantity_total > 0),
  source_type text not null default 'manual' check (source_type in ('manual', 'ai')),
  status donation_status not null default 'draft',
  delivery_method delivery_method not null default 'platform_delivery',
  pickup_location_text text,
  pickup_latitude numeric(10,7),
  pickup_longitude numeric(10,7),
  ai_match_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table donation_attachments (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references donations(id) on delete cascade,
  file_url text not null,
  file_name text,
  mime_type text,
  file_role text not null default 'photo' check (file_role in ('photo', 'document', 'receipt', 'proof')),
  created_at timestamptz not null default now()
);



-- Allocation of one donation across multiple needs/orgs
create table donation_allocations (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references donations(id) on delete cascade,
  need_id uuid not null references needs(id) on delete cascade,
  allocated_quantity integer not null check (allocated_quantity > 0),
  status allocation_status not null default 'pending',
  delivery_method delivery_method not null default 'platform_delivery',
  estimated_delivery_date date,
  scheduled_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  delivered_at timestamptz,
  confirmed_at timestamptz,
  match_score numeric(5,2),
  match_reason text,
  route_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (donation_id, need_id)
);



create table delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null unique references donation_allocations(id) on delete cascade,
  uploaded_by_profile_id uuid references profiles(id) on delete set null,
  image_url text not null,
  proof_timestamp timestamptz not null default now(),
  location_text text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  confirmed_by_profile_id uuid references profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);



create table donation_events (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references donations(id) on delete cascade,
  allocation_id uuid references donation_allocations(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_profile_id uuid references profiles(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);



-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);



-- Useful indexes
create index idx_organizations_owner_profile_id on organizations(owner_profile_id);
create index idx_organizations_verification_status on organizations(verification_status);
create index idx_organizations_emergency on organizations(is_emergency);
create index idx_organization_members_profile_id on organization_members(profile_id);
create index idx_needs_organization_id on needs(organization_id);
create index idx_needs_status_urgency on needs(status, urgency);
create index idx_needs_created_at on needs(created_at desc);
create index idx_donations_donor_profile_id on donations(donor_profile_id);
create index idx_donations_status on donations(status);
create index idx_donation_allocations_donation_id on donation_allocations(donation_id);
create index idx_donation_allocations_need_id on donation_allocations(need_id);
create index idx_donation_allocations_status on donation_allocations(status);
create index idx_delivery_proofs_allocation_id on delivery_proofs(allocation_id);
create index idx_notifications_profile_read_created on notifications(profile_id, is_read, created_at desc);
