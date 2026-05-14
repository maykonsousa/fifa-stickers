ALTER TABLE profiles ADD COLUMN sticker_count INT NOT NULL DEFAULT 0;

UPDATE profiles
SET sticker_count = sub.cnt
FROM (
  SELECT user_id, COUNT(DISTINCT sticker_id) AS cnt
  FROM user_stickers
  GROUP BY user_id
) sub
WHERE profiles.id = sub.user_id;

CREATE OR REPLACE FUNCTION update_profile_sticker_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET sticker_count = (
      SELECT COUNT(DISTINCT sticker_id) FROM public.user_stickers WHERE user_id = NEW.user_id
    )
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET sticker_count = (
      SELECT COUNT(DISTINCT sticker_id) FROM public.user_stickers WHERE user_id = OLD.user_id
    )
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_user_sticker_change
  AFTER INSERT OR DELETE ON user_stickers
  FOR EACH ROW EXECUTE FUNCTION update_profile_sticker_count();