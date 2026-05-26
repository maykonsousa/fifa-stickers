-- 056_add_album_position_to_stickers.sql
-- Adiciona posição da figurinha no álbum físico (página + linha + coluna).
-- Colunas nullable inicialmente: schema entra em prod antes do mapeamento
-- estar completo. UI trata page IS NULL como "ainda não posicionada".
-- Índice único parcial impede duas figurinhas no mesmo slot.

ALTER TABLE stickers
  ADD COLUMN page INT,
  ADD COLUMN row INT,
  ADD COLUMN col INT;

CREATE INDEX idx_stickers_page ON stickers(page);

CREATE UNIQUE INDEX idx_stickers_page_position
  ON stickers(page, row, col)
  WHERE page IS NOT NULL;
