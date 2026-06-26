-- Backfill: cada perfil ganha "Meu Álbum - 001" (template copa-2026), recebe as
-- figurinhas existentes, e vira o álbum ativo + público. Idempotente.

-- 1) Criar o álbum padrão para todo perfil que ainda não tem nenhum álbum.
INSERT INTO albums (user_id, name, template)
SELECT p.id, 'Meu Álbum - 001', 'copa-2026'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM albums a WHERE a.user_id = p.id);

-- 2) Atribuir todas as user_stickers sem álbum ao álbum padrão do dono.
UPDATE user_stickers us
SET album_id = a.id
FROM albums a
WHERE us.album_id IS NULL
  AND a.user_id = us.user_id
  AND a.name = 'Meu Álbum - 001';

-- 3) Setar active/public para o álbum padrão quando ainda nulos.
UPDATE profiles p
SET active_album_id = a.id
FROM albums a
WHERE p.active_album_id IS NULL
  AND a.user_id = p.id
  AND a.name = 'Meu Álbum - 001';

UPDATE profiles p
SET public_album_id = a.id
FROM albums a
WHERE p.public_album_id IS NULL
  AND a.user_id = p.id
  AND a.name = 'Meu Álbum - 001';

-- 4) Recalcular sticker_count por álbum (distintas).
UPDATE albums a
SET sticker_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT album_id, COUNT(DISTINCT sticker_id) AS cnt
  FROM user_stickers
  WHERE album_id IS NOT NULL
  GROUP BY album_id
) sub
WHERE a.id = sub.album_id;

-- 5) Travar album_id como obrigatório (só roda se não restou nenhum NULL).
ALTER TABLE user_stickers ALTER COLUMN album_id SET NOT NULL;
