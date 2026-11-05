export type BookingStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
export type TicketStatus = "VALID" | "USED" | "VOID";
export type ScanOutcome = "VALID" | "ALREADY_USED" | "INVALID" | "UNPAID";

export interface EventRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  venue: string;
  starts_at: Date;
  ends_at: Date | null;
  timezone: string;
  price_minor: number;
  currency: string;
  capacity: number;
  sold: number;
  is_active: boolean;
  created_at: Date;
}

export interface BookingRow {
  id: string;
  reference: string;
  event_id: string;
  customer_name: string;
  phone: string;
  email: string;
  quantity: number;
  unit_price_minor: number;
  amount_minor: number;
  currency: string;
  status: BookingStatus;
  channel: "ONLINE" | "GATE";
  payment_method: "CASH" | "MOBILE_MONEY" | null;
  sold_by: string | null;
  provider: string;
  provider_ref: string;
  provider_tx_id: string | null;
  paid_at: Date | null;
  expires_at: Date;
  created_at: Date;
}

export interface TicketRow {
  id: string;
  booking_id: string;
  token_hash: string;
  status: TicketStatus;
  admits: number;
  attendee_index: number;
  attendee_label: string | null;
  issued_at: Date;
  used_at: Date | null;
}
