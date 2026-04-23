-- Run this after creating the schema.
-- It enables RLS and defines least-privilege policies for donor/receiver roles.

alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_documents enable row level security;
alter table needs enable row level security;
alter table donations enable row level security;
alter table donation_allocations enable row level security;
alter table delivery_proofs enable row level security;
alter table donation_events enable row level security;
alter table notifications enable row level security;
alter table ai_donation_sessions enable row level security;
alter table ai_donation_messages enable row level security;
alter table donation_attachments enable row level security;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function is_receiver_member(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from organizations o
    where o.id = org_id and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = org_id and om.profile_id = auth.uid()
  );
$$;

-- profiles
create policy profiles_select_self_or_admin
on profiles for select
using (id = auth.uid() or is_admin());

create policy profiles_insert_self
on profiles for insert
with check (id = auth.uid() or is_admin());

create policy profiles_update_self_or_admin
on profiles for update
using (id = auth.uid() or is_admin())
with check (id = auth.uid() or is_admin());

-- user_preferences
create policy user_preferences_self_all
on user_preferences for all
using (profile_id = auth.uid() or is_admin())
with check (profile_id = auth.uid() or is_admin());

-- organizations
create policy organizations_select_member_or_admin
on organizations for select
using (is_receiver_member(id) or is_admin());

create policy organizations_insert_owner_or_admin
on organizations for insert
with check (owner_profile_id = auth.uid() or is_admin());

create policy organizations_update_member_or_admin
on organizations for update
using (is_receiver_member(id) or is_admin())
with check (is_receiver_member(id) or is_admin());

-- organization_members
create policy org_members_select_member_or_admin
on organization_members for select
using (profile_id = auth.uid() or is_receiver_member(organization_id) or is_admin());

create policy org_members_insert_owner_or_admin
on organization_members for insert
with check (is_receiver_member(organization_id) or is_admin());

-- organization_documents
create policy org_docs_select_member_or_admin
on organization_documents for select
using (is_receiver_member(organization_id) or is_admin());

create policy org_docs_insert_member_or_admin
on organization_documents for insert
with check (is_receiver_member(organization_id) or is_admin());

create policy org_docs_update_member_or_admin
on organization_documents for update
using (is_receiver_member(organization_id) or is_admin())
with check (is_receiver_member(organization_id) or is_admin());

-- needs
create policy needs_public_read_active
on needs for select
using (status = 'active' or is_receiver_member(organization_id) or is_admin());

create policy needs_insert_receiver_or_admin
on needs for insert
with check (is_receiver_member(organization_id) or is_admin());

create policy needs_update_receiver_or_admin
on needs for update
using (is_receiver_member(organization_id) or is_admin())
with check (is_receiver_member(organization_id) or is_admin());

-- donations
create policy donations_select_owner_or_receiver_or_admin
on donations for select
using (
  donor_profile_id = auth.uid()
  or is_admin()
  or exists (
    select 1
    from donation_allocations da
    join needs n on n.id = da.need_id
    where da.donation_id = donations.id
      and is_receiver_member(n.organization_id)
  )
);

create policy donations_insert_owner_or_admin
on donations for insert
with check (donor_profile_id = auth.uid() or is_admin());

create policy donations_update_owner_or_admin
on donations for update
using (donor_profile_id = auth.uid() or is_admin())
with check (donor_profile_id = auth.uid() or is_admin());

-- donation_allocations
create policy allocations_select_related_or_admin
on donation_allocations for select
using (
  is_admin()
  or exists (
    select 1 from donations d
    where d.id = donation_allocations.donation_id
      and d.donor_profile_id = auth.uid()
  )
  or exists (
    select 1 from needs n
    where n.id = donation_allocations.need_id
      and is_receiver_member(n.organization_id)
  )
);

create policy allocations_insert_admin_only
on donation_allocations for insert
with check (is_admin());

create policy allocations_update_receiver_or_admin
on donation_allocations for update
using (
  is_admin()
  or exists (
    select 1 from needs n
    where n.id = donation_allocations.need_id
      and is_receiver_member(n.organization_id)
  )
)
with check (
  is_admin()
  or exists (
    select 1 from needs n
    where n.id = donation_allocations.need_id
      and is_receiver_member(n.organization_id)
  )
);

-- delivery_proofs
create policy proofs_select_related_or_admin
on delivery_proofs for select
using (
  is_admin()
  or exists (
    select 1
    from donation_allocations da
    join donations d on d.id = da.donation_id
    where da.id = delivery_proofs.allocation_id
      and d.donor_profile_id = auth.uid()
  )
  or exists (
    select 1
    from donation_allocations da
    join needs n on n.id = da.need_id
    where da.id = delivery_proofs.allocation_id
      and is_receiver_member(n.organization_id)
  )
);

create policy proofs_insert_related_or_admin
on delivery_proofs for insert
with check (
  is_admin()
  or exists (
    select 1
    from donation_allocations da
    join needs n on n.id = da.need_id
    where da.id = delivery_proofs.allocation_id
      and is_receiver_member(n.organization_id)
  )
);

-- donation_events
create policy events_select_related_or_admin
on donation_events for select
using (
  is_admin()
  or actor_profile_id = auth.uid()
  or exists (
    select 1 from donations d
    where d.id = donation_events.donation_id
      and d.donor_profile_id = auth.uid()
  )
  or exists (
    select 1
    from donation_allocations da
    join needs n on n.id = da.need_id
    where da.id = donation_events.allocation_id
      and is_receiver_member(n.organization_id)
  )
);

create policy events_insert_actor_or_admin
on donation_events for insert
with check (actor_profile_id = auth.uid() or is_admin());

-- notifications
create policy notifications_self_all
on notifications for all
using (profile_id = auth.uid() or is_admin())
with check (profile_id = auth.uid() or is_admin());

-- AI donation sessions / messages
create policy ai_sessions_self_all
on ai_donation_sessions for all
using (donor_profile_id = auth.uid() or is_admin())
with check (donor_profile_id = auth.uid() or is_admin());

create policy ai_messages_self_all
on ai_donation_messages for all
using (
  is_admin()
  or exists (
    select 1 from ai_donation_sessions s
    where s.id = ai_donation_messages.session_id
      and s.donor_profile_id = auth.uid()
  )
)
with check (
  is_admin()
  or exists (
    select 1 from ai_donation_sessions s
    where s.id = ai_donation_messages.session_id
      and s.donor_profile_id = auth.uid()
  )
);

-- donation attachments
create policy donation_attachments_self_or_admin
on donation_attachments for all
using (
  is_admin()
  or exists (
    select 1 from donations d
    where d.id = donation_attachments.donation_id
      and d.donor_profile_id = auth.uid()
  )
)
with check (
  is_admin()
  or exists (
    select 1 from donations d
    where d.id = donation_attachments.donation_id
      and d.donor_profile_id = auth.uid()
  )
);
