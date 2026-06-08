-- 064_lookup_sticker_by_code.sql
-- Funde as duas queries do scanner (busca o sticker por código + conta as cópias
-- do usuário) numa RPC única, tirando um round-trip do caminho crítico pós-Vision.
-- Usada por lib/scanner/lookup-sticker-by-code.ts.

CREATE OR REPLACE FUNCTION lookup_sticker_by_code(p_code TEXT, p_user_id UUID)
RETURNS TABLE (
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  owned_count INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.id,
    s.code,
    s.title,
    s.image_url,
    (
      SELECT COUNT(*)::INT
      FROM public.user_stickers us
      WHERE us.sticker_id = s.id AND us.user_id = p_user_id
    ) AS owned_count
  FROM public.stickers s
  WHERE s.code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_sticker_by_code(TEXT, UUID) TO authenticated, anon;
