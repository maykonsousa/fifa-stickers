-- 058_public_stickers_album_rpc.sql
-- RPC dedicada pro modo álbum do perfil. Retorna TODAS as figurinhas com
-- page IS NOT NULL (após filtros), ordenadas por (page, row, col).
-- Sem paginação por offset: universo é ~220 stickers, cabe em uma resposta.
-- Frontend agrupa por page em memória.

CREATE OR REPLACE FUNCTION get_public_stickers_album(
  p_user_id UUID,
  p_group_id INT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id INT,
  code TEXT,
  title TEXT,
  image_url TEXT,
  page INT,
  -- "row" e "col" precisam ser aspeados em RETURNS TABLE porque o parser
  -- do Postgres trata `row` como construtor de tipo. Como identificador
  -- normal (s.row dentro da query) e como ADD COLUMN, funciona sem aspas.
  "row" INT,
  "col" INT,
  group_id INT,
  group_name TEXT,
  duplicate_count INT,
  viewer_owned_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  -- Diferente da get_public_stickers da lista, aqui não excluímos o caso
  -- viewer = owner. O modo álbum mostra TODAS as figurinhas e o card precisa
  -- da contagem da pessoa logada pra renderizar estado de posse — quando ela
  -- é a própria dona, a contagem do "viewer" coincide com a do dono, e a
  -- subquery devolve naturalmente o valor certo.
  v_viewer_present BOOLEAN := p_viewer_id IS NOT NULL;
BEGIN
  RETURN QUERY
  WITH owner_counts AS (
    SELECT us.sticker_id, COUNT(*) AS cnt
    FROM public.user_stickers us
    WHERE us.user_id = p_user_id
    GROUP BY us.sticker_id
  )
  SELECT
    s.id,
    s.code,
    s.title,
    s.image_url,
    s.page,
    s.row,
    s.col,
    sg.id AS group_id,
    sg.name AS group_name,
    COALESCE((oc.cnt - 1), 0)::INT AS duplicate_count,
    CASE
      WHEN v_viewer_present THEN COALESCE((
        SELECT COUNT(*)::INT FROM public.user_stickers us
        WHERE us.user_id = p_viewer_id AND us.sticker_id = s.id
      ), 0)
      ELSE 0
    END AS viewer_owned_count
  FROM public.stickers s
  JOIN public.sticker_groups sg ON sg.id = s.group_id
  LEFT JOIN owner_counts oc ON oc.sticker_id = s.id
  WHERE s.page IS NOT NULL
    AND (p_group_id IS NULL OR s.group_id = p_group_id)
    AND (p_keyword IS NULL OR s.code ILIKE '%' || p_keyword || '%')
  ORDER BY s.page, s.row, s.col;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_stickers_album(UUID, INT, TEXT, UUID) TO anon, authenticated;
