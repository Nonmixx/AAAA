-- Receiver-safe RLS fix.
-- Run this after auth_quickfix.sql.
-- It removes recursive organizations/member policy references that cause:
--   infinite recursion detected in policy for relation "organizations"

drop policy if exists organizations_select_member on organizations;
drop policy if exists organizations_insert_owner on organizations;
drop policy if exists organizations_update_member on organizations;

create policy organizations_select_owner
on organizations
for select
to authenticated
using (owner_profile_id = auth.uid());

create policy organizations_insert_owner
on organizations
for insert
to authenticated
with check (owner_profile_id = auth.uid());

create policy organizations_update_owner
on organizations
for update
to authenticated
using (owner_profile_id = auth.uid())
with check (owner_profile_id = auth.uid());

drop policy if exists organization_members_select_related on organization_members;
drop policy if exists organization_members_insert_owner on organization_members;

create policy organization_members_select_self
on organization_members
for select
to authenticated
using (profile_id = auth.uid());

create policy organization_members_insert_self
on organization_members
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists organization_documents_select_related on organization_documents;
drop policy if exists organization_documents_insert_related on organization_documents;
drop policy if exists organization_documents_update_related on organization_documents;

create policy organization_documents_owner_only_select
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
);

create policy organization_documents_owner_only_insert
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
);

create policy organization_documents_owner_only_update
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
)
with check (
  exists (
    select 1
    from organizations o
    where o.id = organization_documents.organization_id
      and o.owner_profile_id = auth.uid()
  )
);

drop policy if exists needs_public_read_active on needs;
drop policy if exists needs_insert_related on needs;
drop policy if exists needs_update_related on needs;

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
);

create policy needs_insert_owner
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
);

create policy needs_update_owner
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
)
with check (
  exists (
    select 1
    from organizations o
    where o.id = needs.organization_id
      and o.owner_profile_id = auth.uid()
  )
);
