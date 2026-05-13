ALTER TABLE profiles
  ADD COLUMN username VARCHAR(14) UNIQUE,
  ADD COLUMN share_whatsapp BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN share_instagram BOOLEAN NOT NULL DEFAULT false;

-- Gerar username para usuários existentes
UPDATE profiles
SET username = LOWER(
  REGEXP_REPLACE(LEFT(display_name, 6), '[^a-zA-Z0-9]', '', 'g')
  || SUBSTR(MD5(RANDOM()::TEXT), 1, 6)
);

ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;

-- Atualizar trigger para gerar username no cadastro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  base_name TEXT;
  new_username TEXT;
BEGIN
  base_name := LOWER(REGEXP_REPLACE(
    LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 6),
    '[^a-z0-9]', '', 'g'
  ));
  new_username := base_name || SUBSTR(MD5(NEW.id::TEXT), 1, 14 - LENGTH(base_name));

  INSERT INTO public.profiles (id, display_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    new_username
  );
  RETURN NEW;
END;
$$;
