-- Seed FWC stickers (11)
INSERT INTO stickers (group_id, code, number)
SELECT g.id, 'FWC' || n, n
FROM sticker_groups g, generate_series(1, 11) AS n
WHERE g.code = 'FWC';

-- Seed team stickers (48 teams x 20 = 960)
DO $$
DECLARE
  team RECORD;
  i INT;
  prefix TEXT;
BEGIN
  FOR team IN SELECT id, code FROM sticker_groups WHERE type = 'team' LOOP
    prefix := team.code;
    FOR i IN 1..20 LOOP
      INSERT INTO stickers (group_id, code, number)
      VALUES (team.id, prefix || i, i);
    END LOOP;
  END LOOP;
END;
$$;
