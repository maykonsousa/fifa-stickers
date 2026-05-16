-- 045_proposal_rls.sql
-- RLS de leitura: só participantes (proponente OU dono) leem proposta + itens + mensagens.
-- Escrita só via RPC SECURITY DEFINER (sem policy de INSERT/UPDATE/DELETE).

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select_participant" ON proposals
  FOR SELECT TO authenticated
  USING (auth.uid() = proposer_user_id OR auth.uid() = owner_user_id);

CREATE POLICY "proposal_items_select_via_proposal" ON proposal_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_items.proposal_id
      AND (p.proposer_user_id = auth.uid() OR p.owner_user_id = auth.uid())
  ));

CREATE POLICY "proposal_messages_select_via_proposal" ON proposal_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_messages.proposal_id
      AND (p.proposer_user_id = auth.uid() OR p.owner_user_id = auth.uid())
  ));
