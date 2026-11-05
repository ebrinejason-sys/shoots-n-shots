import { confirmBooking, type ConfirmResult } from "./booking";
import { APP_URL } from "./config";
import { deliverTicket } from "./delivery";
import type { TicketMessage } from "./delivery";
import { formatMoney } from "./money";
import { qrPngUrlFor, ticketUrlFor } from "./tickets";
import type { BookingRow, EventRow, TicketRow } from "./types";

/** Builds the delivery payload for one or more admission codes. */
export function buildTicketMessage(
  booking: BookingRow,
  event: EventRow,
  tickets: TicketRow[],
  appUrl: string = APP_URL,
): TicketMessage {
  const items = tickets.map((ticket) => ({
    index: ticket.attendee_index,
    label: ticket.attendee_label ?? booking.customer_name,
    ticketUrl: ticketUrlFor(ticket.id, appUrl),
    qrPngUrl: qrPngUrlFor(ticket.id, appUrl),
  }));

  return {
    customerName: booking.customer_name,
    phone: booking.phone,
    email: booking.email,
    eventName: event.name,
    eventVenue: event.venue,
    eventStartsAt: event.starts_at,
    quantity: booking.quantity,
    reference: booking.reference,
    amountLabel: formatMoney(booking.amount_minor, booking.currency),
    tickets: items,
  };
}

/**
 * Marks a booking paid and issues its ticket, then dispatches delivery.
 * Delivery runs after the payment transaction commits and is best-effort:
 * a messaging outage must never fail or roll back a payment.
 */
export async function fulfilBooking(
  reference: string,
  providerTxId: string,
): Promise<ConfirmResult | null> {
  const result = await confirmBooking(reference, providerTxId);
  if (!result) return null;
  if (result.alreadyConfirmed) return result;

  const { booking, event } = result;

  try {
    await deliverTicket(booking.id, buildTicketMessage(booking, event, [result.ticket]));
  } catch (error) {
    console.error("ticket delivery failed", error);
  }

  return result;
}
