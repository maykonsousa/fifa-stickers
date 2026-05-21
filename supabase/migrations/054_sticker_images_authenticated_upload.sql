DROP POLICY IF EXISTS "sticker_images_insert_admin" ON storage.objects;

CREATE POLICY "sticker_images_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sticker-images');
