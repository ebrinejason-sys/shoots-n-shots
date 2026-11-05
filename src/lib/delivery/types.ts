export interface TicketItem {
  index: number;
  label: string;
  ticketUrl: string;
  qrPngUrl: string;
}

export interface TicketMessage {
  customerName: string;
  phone: string;
  email: string;
  eventName: string;
  eventVenue: string;
  eventStartsAt: Date;
  quantity: number;
  reference: string;
  amountLabel: string;
  // One entry per admission code: online bookings carry one, gate sales one
  // per attendee.
  tickets: TicketItem[];
}

export interface DeliveryResult {
  ok: boolean;
  detail: string;
}

export interface DeliveryChannel {
  name: string;
  send(message: TicketMessage): Promise<DeliveryResult>;
}
