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
  ticketUrl: string;
  qrPngUrl: string;
}

export interface DeliveryResult {
  ok: boolean;
  detail: string;
}

export interface DeliveryChannel {
  name: string;
  send(message: TicketMessage): Promise<DeliveryResult>;
}
