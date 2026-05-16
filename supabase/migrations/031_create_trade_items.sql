CREATE TABLE trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  sticker_id INT NOT NULL REFERENCES stickers(id),
  direction TEXT NOT NULL CHECK (direction IN ('given', 'received')),
  quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_trade_items_trade ON trade_items(trade_id);
