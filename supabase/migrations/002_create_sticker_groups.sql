CREATE TABLE sticker_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('team', 'fwc', 'sponsor')),
  description TEXT,
  flag_url TEXT,
  sticker_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_sticker_groups_code ON sticker_groups(code);
CREATE INDEX idx_sticker_groups_type ON sticker_groups(type);
