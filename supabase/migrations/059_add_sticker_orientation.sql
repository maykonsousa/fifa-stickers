-- 059_add_sticker_orientation.sql
-- Algumas figurinhas (especialmente FWC) são apaisadas. Schema atual assume
-- todas retrato (aspect 49:63). Adiciona orientation com default portrait
-- e CHECK garantindo só os dois valores válidos.

ALTER TABLE stickers
  ADD COLUMN orientation TEXT NOT NULL DEFAULT 'portrait'
    CHECK (orientation IN ('portrait', 'landscape'));
