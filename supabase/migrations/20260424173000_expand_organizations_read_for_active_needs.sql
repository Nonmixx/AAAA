-- Allow anonymous and authenticated users to read organization records
-- whenever the organization has at least one active need.
--
-- This keeps public /needs, donor landing urgent cards, and donor browse-needs
-- aligned with the current live `needs` table instead of hiding rows because
-- the joined `organizations` record is blocked by stricter listing policies.

grant select on table organizations to anon, authenticated;

drop policy if exists organizations_public_read_for_active_listings on organizations;
drop policy if exists organizations_public_read_approved on organizations;

create policy organizations_public_read_for_active_needs
on organizations for select
using (
  exists (
    select 1
    from needs n
    where n.organization_id = organizations.id
      and n.status = 'active'
  )
);
