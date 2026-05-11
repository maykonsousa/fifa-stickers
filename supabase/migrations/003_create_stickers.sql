CREATE TABLE stickers (
  id SERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES sticker_groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  number INT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT
);

CREATE INDEX idx_stickers_group_id ON stickers(group_id);
CREATE INDEX idx_stickers_code ON stickers(code);
