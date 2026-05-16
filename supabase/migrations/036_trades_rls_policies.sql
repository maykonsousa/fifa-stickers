ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- leads: só quem convidou enxerga
CREATE POLICY "leads_select_own" ON leads FOR SELECT TO authenticated
  USING (auth.uid() = invited_by_user_id);

-- trades: iniciador ou counterparty membro
CREATE POLICY "trades_select_participant" ON trades FOR SELECT TO authenticated
  USING (auth.uid() = initiator_user_id OR auth.uid() = counterparty_user_id);

-- trade_items: visíveis via trade
CREATE POLICY "trade_items_select_via_trade" ON trade_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trades t WHERE t.id = trade_items.trade_id
      AND (t.initiator_user_id = auth.uid() OR t.counterparty_user_id = auth.uid())
  ));

-- email_log: sem policy de SELECT = bloqueado pro authenticated
-- (acesso só via service role, fora do client)
