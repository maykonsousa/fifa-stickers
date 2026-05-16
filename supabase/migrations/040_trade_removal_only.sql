-- Trade só remove. Não credita automaticamente o lado "received" em nenhum
-- counterparty. O recebedor adiciona ao álbum manualmente via UI (Step 4 do
-- wizard ou via /collection depois). Isso espelha a realidade física: ter
-- figurinha na mão ≠ figurinha colada no álbum.

CREATE OR REPLACE FUNCTION create_trade(
  p_counterparty_user_id UUID,
  p_counterparty_lead_id UUID,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_initiator_id UUID := auth.uid();
  v_trade_id UUID;
  v_item JSONB;
  v_given_count INT;
  v_received_count INT;
BEGIN
  IF v_initiator_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF (p_counterparty_user_id IS NULL) = (p_counterparty_lead_id IS NULL) THEN
    RAISE EXCEPTION 'must provide exactly one of counterparty_user_id or counterparty_lead_id';
  END IF;

  IF p_counterparty_user_id = v_initiator_id THEN
    RAISE EXCEPTION 'cannot trade with yourself';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE item->>'direction' = 'given'),
    COUNT(*) FILTER (WHERE item->>'direction' = 'received')
  INTO v_given_count, v_received_count
  FROM jsonb_array_elements(p_items) AS item;

  IF v_given_count = 0 OR v_received_count = 0 THEN
    RAISE EXCEPTION 'trade must have at least one given and one received item';
  END IF;

  INSERT INTO trades (initiator_user_id, counterparty_user_id, counterparty_lead_id)
  VALUES (v_initiator_id, p_counterparty_user_id, p_counterparty_lead_id)
  RETURNING id INTO v_trade_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO trade_items (trade_id, sticker_id, direction, quantity)
    VALUES (
      v_trade_id,
      (v_item->>'sticker_id')::INT,
      v_item->>'direction',
      (v_item->>'quantity')::INT
    );

    IF v_item->>'direction' = 'given' THEN
      -- Quem deu perde da coleção; quem recebe adiciona manualmente depois.
      PERFORM remove_user_stickers(v_initiator_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
    ELSE  -- 'received'
      -- Iniciador NÃO ganha automaticamente.
      -- Counterparty membro perde da coleção dele.
      IF p_counterparty_user_id IS NOT NULL THEN
        PERFORM remove_user_stickers(p_counterparty_user_id, (v_item->>'sticker_id')::INT, (v_item->>'quantity')::INT);
      END IF;
    END IF;
  END LOOP;

  RETURN v_trade_id;
END;
$$;

-- Trigger de conversão de lead: também para de creditar automaticamente as
-- figurinhas recebidas. Lead convertido nasce com álbum vazio; histórico de
-- trocas serve como referência do que adicionar quando colar.
CREATE OR REPLACE FUNCTION handle_new_user_lead_conversion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead leads%ROWTYPE;
BEGIN
  SELECT * INTO v_lead
  FROM leads
  WHERE email = lower(trim(NEW.email))
    AND converted_to_profile_id IS NULL;

  IF v_lead.id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE profiles
  SET
    display_name = COALESCE(NULLIF(display_name, NEW.email), v_lead.name, display_name),
    city = COALESCE(city, v_lead.city),
    state = COALESCE(state, v_lead.state),
    whatsapp = COALESCE(whatsapp, v_lead.whatsapp)
  WHERE id = NEW.id;

  UPDATE trades
  SET counterparty_user_id = NEW.id, counterparty_lead_id = NULL
  WHERE counterparty_lead_id = v_lead.id;

  UPDATE leads SET converted_to_profile_id = NEW.id WHERE id = v_lead.id;

  RETURN NEW;
END;
$$;

-- Nova RPC pra bulk-insert de figurinhas no álbum do iniciador (Step 4 do
-- wizard ou outros usos futuros). Não duplica: se já tem, adiciona outra
-- linha (mantém quantity tracking via row count).
CREATE OR REPLACE FUNCTION add_stickers_to_collection(p_sticker_ids INT[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  INSERT INTO user_stickers (user_id, sticker_id)
  SELECT v_user_id, sticker_id FROM unnest(p_sticker_ids) AS sticker_id;
END;
$$;
