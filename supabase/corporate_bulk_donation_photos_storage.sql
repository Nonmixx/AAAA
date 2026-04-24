-- Supabase Storage for corporate bulk donation images (referenced in corporate_ledger_entries.bulk_details.photo_urls).
-- 1) In Dashboard → Storage → New bucket: id = corporate_bulk_donation_photos, set Public if you want <img src> without signed URLs.
-- 2) Run this SQL (adjust allowed_mime_types / file_size_limit if needed).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'corporate_bulk_donation_photos',
  'corporate_bulk_donation_photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS corporate_bulk_photos_insert_own ON storage.objects;
CREATE POLICY corporate_bulk_photos_insert_own
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'corporate_bulk_donation_photos'
    AND split_part(name, '/', 1) IN (
      SELECT id::text FROM public.corporate_partners WHERE owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS corporate_bulk_photos_select ON storage.objects;
DROP POLICY IF EXISTS corporate_bulk_photos_select_own ON storage.objects;
CREATE POLICY corporate_bulk_photos_select_own
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'corporate_bulk_donation_photos'
    AND split_part(name, '/', 1) IN (
      SELECT id::text FROM public.corporate_partners WHERE owner_profile_id = auth.uid()
    )
  );

-- Public bucket: anonymous read for getPublicUrl() in <img> (optional — remove if bucket is private and you use signed URLs instead).
DROP POLICY IF EXISTS corporate_bulk_photos_public_read ON storage.objects;
CREATE POLICY corporate_bulk_photos_public_read
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'corporate_bulk_donation_photos');
