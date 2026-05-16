-- 042_create_proposal_items.sql
-- Items da proposta, sempre do ponto de vista do PROPONENTE:
--   'want'  = proponente quer receber do dono
--   'offer' = proponente oferece do próprio acervo
-- UNIQUE garante uma figurinha no máximo 1x por lado; múltiplas cópias em `quantity`.

CREATE TABLE proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES stickers(id),
  direction TEXT NOT NULL CHECK (direction IN ('want', 'offer')),
  quantity INT NOT NULL CHECK (quantity > 0),
  UNIQUE (proposal_id, sticker_id, direction)
);

CREATE INDEX idx_proposal_items_proposal ON proposal_items(proposal_id);
