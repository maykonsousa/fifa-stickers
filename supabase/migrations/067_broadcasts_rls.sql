-- 067_broadcasts_rls.sql
-- Só admins podem ler/escrever broadcasts e broadcast_recipients.

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcasts_admin_all" ON broadcasts
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "broadcast_recipients_admin_all" ON broadcast_recipients
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
