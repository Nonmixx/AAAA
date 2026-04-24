-- Allow anonymous (and signed-in) users to read organizations that have at least one
-- active, published need. Needed for public /needs browse + detail pages joining
-- `needs` → `organizations` under the anon key.
--
-- Run after base schema + RLS (`supabase/rls.sql`).

create policy organizations_public_read_for_active_listings
on organizations for select
using (
  exists (
    select 1
    from needs n
    where n.organization_id = organizations.id
      and n.status = 'active'
      and n.published_at is not null
  )
);
