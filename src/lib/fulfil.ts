import { confirmBooking, type ConfirmResult } from "./booking";
import { deliverTicket } from "./delivery";
import type { TicketMessage } from "./delivery";
import { formatMoney } from "./money";
import { qrPngUrlFor, ticketUrlFor } from "./tickets";

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
  const message: TicketMessage = {
    customerName: booking.customer_name,
    phone: booking.phone,
    email: booking.email,
    eventName: event.name,
    eventVenue: event.venue,
    eventStartsAt: event.starts_at,
    quantity: booking.quantity,
    reference: booking.reference,
    amountLabel: formatMoney(booking.amount_minor, booking.currency),
    ticketUrl: ticketUrlFor(booking.id),
    qrPngUrl: qrPngUrlFor(booking.id),
  };

  try {
    await deliverTicket(booking.id, message);
  } catch (error) {
    console.error("ticket delivery failed", error);
  }

  return result;
}
