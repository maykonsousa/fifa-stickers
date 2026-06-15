export type ProposalDirection = "want" | "offer";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface ProposalItem {
  sticker_id: number;
  direction: ProposalDirection;
  quantity: number;
}

export interface ProposalItemDetail {
  sticker_id: number;
  direction: ProposalDirection;
  quantity: number;
  code: string;
  title: string | null;
  image_url: string | null;
}

export interface ProposalListRow {
  id: string;
  other_user_id: string;
  other_name: string;
  other_avatar_url: string | null;
  status: ProposalStatus;
  want_count: number;
  offer_count: number;
  last_activity_at: string;
  is_unseen: boolean;
}

export interface ProposalMessageRow {
  id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
}

export type ProposalTab = "received" | "sent";
