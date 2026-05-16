export type TradeDirection = "given" | "received";

export interface TradeItem {
  sticker_id: number;
  direction: TradeDirection;
  quantity: number;
}

export interface CounterpartyMember {
  type: "member";
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
}

export interface CounterpartyLead {
  type: "lead";
  /** Presente quando o lead já existe no banco (busca por email achou). */
  id?: string;
  email: string;
  name: string;
  city?: string;
  state?: string;
  whatsapp?: string;
}

export type Counterparty = CounterpartyMember | CounterpartyLead;

export interface Swap {
  given: { sticker_id: number; quantity: number }[];
  received: { sticker_id: number; quantity: number }[];
}

export interface StickerOption {
  id: number;
  group_id: number;
  code: string;
  number: number;
  title: string | null;
  image_url: string | null;
  owned_count: number;
}

export interface TradeHistoryRow {
  id: string;
  counterparty_kind: "member" | "lead";
  counterparty_name: string;
  counterparty_email: string;
  counterparty_avatar_url: string | null;
  given_count: number;
  received_count: number;
  created_at: string;
  is_unseen: boolean;
}
