-- Allow both organization owners and organization members to manage needs.
-- This fixes receiver accounts that can open Create Need but fail on submit.

drop policy if exists needs_insert_owner on needs;
drop policy if exists needs_update_owner on needs;
drop policy if exists needs_insert_receiver_or_admin on needs;
drop policy if exists needs_update_receiver_or_admin on needs;

create policy needs_insert_member_or_owner
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

create policy needs_update_member_or_owner
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
