-- 063_sticker_group_count_trigger.sql
-- sticker_groups.sticker_count era atualizado manualmente via RPC chamada
-- pelo admin (increment_sticker_group_count). Como a chamada é separada do
-- INSERT, qualquer falha intermediária ou DELETE manual fazia o contador
-- divergir do número real de stickers — caso visto em prod (FWC mostrando 26
-- com apenas 20 stickers reais).
--
-- 1. Backfill: recalcula sticker_count a partir do COUNT(*) real.
-- 2. Trigger AFTER INSERT/DELETE em stickers mantém o contador em sincronia.
-- 3. A RPC increment_sticker_group_count é mantida (sem caller agora) pra
--    não quebrar nada externo; pode ser dropada numa migration futura.

UPDATE sticker_groups g
SET sticker_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT group_id, COUNT(*)::INT AS cnt
  FROM stickers
  GROUP BY group_id
) sub
WHERE g.id = sub.group_id;

UPDATE sticker_groups
SET sticker_count = 0
WHERE id NOT IN (SELECT DISTINCT group_id FROM stickers);

CREATE OR REPLACE FUNCTION update_sticker_group_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.sticker_groups
    SET sticker_count = sticker_count + 1
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.sticker_groups
    SET sticker_count = GREATEST(sticker_count - 1, 0)
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_sticker_change_update_group_count ON stickers;
CREATE TRIGGER on_sticker_change_update_group_count
  AFTER INSERT OR DELETE ON stickers
  FOR EACH ROW EXECUTE FUNCTION update_sticker_group_count();
