-- Quick fix for auth-critical inserts during signup/login.
-- Run this in the Supabase SQL editor, then rerun:
--   pnpm test:auth:receiver
--   pnpm test:auth:donor

grant usage on schema public to anon, authenticated;

grant select, insert, update on table profiles to authenticated;
grant select, insert, update on table organizations to authenticated;
grant select, insert, update on table organization_members to authenticated;
grant select, insert, update on table organization_documents to authenticated;
grant select, insert, update on table needs to authenticated;
grant select on table needs to anon;

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_documents enable row level security;
alter table needs enable row level security;

drop policy if exists profiles_select_self_or_admin on profiles;
drop policy if exists profiles_insert_self on profiles;
drop policy if exists profiles_update_self_or_admin on profiles;

create policy profiles_select_self
on profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_self
on profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists organizations_select_member_or_admin on organizations;
drop policy if exists organizations_insert_owner_or_admin on organizations;
drop policy if exists organizations_update_member_or_admin on organizations;

create policy organizations_select_member
on organizations
for select
to authenticated
using (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from organization_members om
    where om.organization_id = organizations.id
      and om.profile_id = auth.uid()
  )
);

create policy organizations_insert_owner
on organizations
for insert
to authenticated
with check (owner_profile_id = auth.uid());

create policy organizations_update_member
on organizations
for update
to authenticated
using (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from organization_members om
    where om.organization_id = organizations.id
      and om.profile_id = auth.uid()
  )
)
with check (
  owner_profile_id = auth.uid()
  or exists (
    select 1
    from organization_members om
    where om.organization_id = organizations.id
      and om.profile_id = auth.uid()
  )
);

drop policy if exists org_members_select_member_or_admin on organization_members;
drop policy if exists org_members_insert_owner_or_admin on organization_members;

create policy organization_members_select_related
on organization_members
for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from organizations o
    where o.id = organization_members.organization_id
      and o.owner_profile_id = auth.uid()
  )
);

create policy organization_members_insert_owner
on organization_members
for insert
to authenticated
with check (
  exists (
    select 1
    from organizations o
    where o.id = organization_members.organization_id
      and o.owner_profile_id = auth.uid()
  )
);

drop policy if exists org_docs_select_member_or_admin on organization_documents;
drop policy if exists org_docs_insert_member_or_admin on organization_documents;
drop policy if exists org_docs_update_member_or_admin on organization_documents;

create policy organization_documents_select_related
on organization_documents
for select
to authenticated
using (
  exists (
    select 1
    from organizations o
    where o.id = organization_documents.organization_id
      and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = organization_documents.organization_id
      and om.profile_id = auth.uid()
  )
);

create policy organization_documents_insert_related
on organization_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from organizations o
    where o.id = organization_documents.organization_id
      and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = organization_documents.organization_id
      and om.profile_id = auth.uid()
  )
);

create policy organization_documents_update_related
on organization_documents
for update
to authenticated
using (
  exists (
    select 1
    from organizations o
    where o.id = organization_documents.organization_id
      and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = organization_documents.organization_id
      and om.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from organizations o
    where o.id = organization_documents.organization_id
      and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = organization_documents.organization_id
      and om.profile_id = auth.uid()
  )
);

drop policy if exists needs_public_read_active on needs;
drop policy if exists needs_insert_receiver_or_admin on needs;
drop policy if exists needs_update_receiver_or_admin on needs;

create policy needs_public_read_active
on needs
for select
to anon, authenticated
using (
  status = 'active'
  or exists (
    select 1
    from organizations o
    where o.id = needs.organization_id
      and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = needs.organization_id
      and om.profile_id = auth.uid()
  )
);

create policy needs_insert_related
on needs
for insert
to authenticated
with check (
  exists (
    select 1
    from organizations o
    where o.id = needs.organization_id
      and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = needs.organization_id
      and om.profile_id = auth.uid()
  )
);

create policy needs_update_related
on needs
for update
to authenticated
using (
  exists (
    select 1
    from organizations o
    where o.id = needs.organization_id
      and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = needs.organization_id
      and om.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from organizations o
    where o.id = needs.organization_id
      and o.owner_profile_id = auth.uid()
  )
  or exists (
    select 1
    from organization_members om
    where om.organization_id = needs.organization_id
      and om.profile_id = auth.uid()
  )
);
