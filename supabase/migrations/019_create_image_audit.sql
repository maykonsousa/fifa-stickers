CREATE TABLE sticker_image_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_uploads_user ON sticker_image_uploads(user_id);
CREATE INDEX idx_image_uploads_sticker ON sticker_image_uploads(sticker_id);

ALTER TABLE sticker_image_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own uploads"
  ON sticker_image_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own uploads"
  ON sticker_image_uploads FOR SELECT
  USING (auth.uid() = user_id);
