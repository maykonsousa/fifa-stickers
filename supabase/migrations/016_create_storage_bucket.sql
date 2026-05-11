INSERT INTO storage.buckets (id, name, public)
VALUES ('sticker-images', 'sticker-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "sticker_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sticker-images');

CREATE POLICY "sticker_images_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sticker-images'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "sticker_images_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'sticker-images'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "sticker_images_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'sticker-images'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );
