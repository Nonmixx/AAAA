-- Fix recursive RLS interactions introduced by policies that read
-- organizations by checking the needs table, while needs policies
-- also read organizations.
--
-- This restores stable login/profile loading and keeps public browse
-- pages readable during testing.

drop policy if exists organizations_public_read_for_active_needs on organizations;
drop policy if exists organizations_public_read_for_active_listings on organizations;
drop policy if exists organizations_public_read_approved on organizations;

grant select on table organizations to anon, authenticated;

create policy organizations_public_read_all
on organizations
for select
to anon, authenticated
using (true);
