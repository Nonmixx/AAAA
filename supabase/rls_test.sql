-- Basic RLS validation checklist.
-- Run after rls.sql. Execute each section while authenticated as that user role in Supabase SQL editor.

-- 1) As receiver A, verify own organization is visible
select id, name from organizations;

-- 2) As receiver A, verify can insert own need
-- replace with your organization id
insert into needs (organization_id, title, description, category, quantity_requested, urgency, status)
values ('00000000-0000-0000-0000-000000000000', 'RLS Test Need', 'RLS test', 'Food & Supplies', 10, 'medium', 'active');

-- 3) As receiver A, verify cannot read another receiver org
-- should return 0 rows
select id, name from organizations where id = '11111111-1111-1111-1111-111111111111';

-- 4) As donor, verify can read public active needs but not receiver private docs
select id, title from needs where status = 'active' limit 10;
select id, document_type from organization_documents limit 10;
-- expected: second query returns 0 rows unless donor also belongs to that org

-- 5) As receiver A, verify allocation status update works only for related needs
-- replace with a valid related allocation id
update donation_allocations set status = 'accepted' where id = '22222222-2222-2222-2222-222222222222';

-- 6) As receiver B, verify cannot update receiver A allocation
update donation_allocations set status = 'rejected' where id = '22222222-2222-2222-2222-222222222222';
-- expected: 0 rows affected
