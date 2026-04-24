alter table organizations add column if not exists logo_url text;
alter table needs add column if not exists image_url text;

grant select on table organizations to anon;

drop policy if exists organizations_public_read_approved on organizations;
create policy organizations_public_read_approved
on organizations
for select
using (verification_status = 'approved');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists public_media_select on storage.objects;
create policy public_media_select
on storage.objects
for select
using (bucket_id = 'public-media');

drop policy if exists public_media_insert_authenticated on storage.objects;
create policy public_media_insert_authenticated
on storage.objects
for insert
to authenticated
with check (bucket_id = 'public-media');

drop policy if exists public_media_update_authenticated on storage.objects;
create policy public_media_update_authenticated
on storage.objects
for update
to authenticated
using (bucket_id = 'public-media')
with check (bucket_id = 'public-media');

drop policy if exists public_media_delete_authenticated on storage.objects;
create policy public_media_delete_authenticated
on storage.objects
for delete
to authenticated
using (bucket_id = 'public-media');
