CREATE OR REPLACE FUNCTION handle_new_user_lead_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_item trade_items%ROWTYPE;
BEGIN
  SELECT * INTO v_lead
  FROM leads
  WHERE email = lower(trim(NEW.email))
    AND converted_to_profile_id IS NULL;

  IF v_lead.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pré-popula profile (handle_new_user já criou; UPDATE só completa)
  UPDATE profiles
  SET
    display_name = COALESCE(NULLIF(display_name, NEW.email), v_lead.name, display_name),
    city = COALESCE(city, v_lead.city),
    state = COALESCE(state, v_lead.state),
    whatsapp = COALESCE(whatsapp, v_lead.whatsapp)
  WHERE id = NEW.id;

  -- Migra trades onde ele era counterparty lead
  UPDATE trades
  SET counterparty_user_id = NEW.id, counterparty_lead_id = NULL
  WHERE counterparty_lead_id = v_lead.id;

  -- Credita figurinhas recebidas em trocas passadas
  FOR v_item IN
    SELECT ti.* FROM trade_items ti
    JOIN trades t ON t.id = ti.trade_id
    WHERE t.counterparty_user_id = NEW.id
      AND ti.direction = 'given'
  LOOP
    PERFORM add_user_stickers(NEW.id, v_item.sticker_id, v_item.quantity);
  END LOOP;

  UPDATE leads SET converted_to_profile_id = NEW.id WHERE id = v_lead.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_lead_conversion
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_lead_conversion();
