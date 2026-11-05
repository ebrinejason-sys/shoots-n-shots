import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  EMAIL_PATTERN,
  PHONE_PATTERN,
  releaseExpiredBookings,
} from "./booking";
import { query, withTransaction } from "./db";
import { computeAmount } from "./money";
import { generateBookingReference } from "./refs";
import { hashToken, ticketTokenFor } from "./tickets";
import type { BookingRow, EventRow, TicketRow } from "./types";

export const gateSaleInputSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  customerName: z.string().trim().min(2).max(120),
  email: z.string().trim().max(200).regex(EMAIL_PATTERN, "Enter a valid email"),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((value) => value === "" || PHONE_PATTERN.test(value), "Enter a valid phone number")
    .default(""),
  quantity: z.coerce.number().int().min(1).max(10),
  method: z.enum(["CASH", "MOBILE_MONEY"]),
});

export type GateSaleInput = z.infer<typeof gateSaleInputSchema>;

export type GateSaleResult =
  | { kind: "created"; booking: BookingRow; event: EventRow; tickets: TicketRow[] }
  | { kind: "sold_out"; remaining: number }
  | { kind: "event_not_found" };

/**
 * Records a walk-in sale as already paid and issues one single-use code per
 * attendee. Capacity is reserved with the same atomic update as online
 * bookings, so the gate and the web share one inventory.
 */
export async function createGateSale(
  input: unknown,
  soldBy: string,
): Promise<GateSaleResult> {
  const data = gateSaleInputSchema.parse(input);

  return withTransaction(async (client) => {
    await releaseExpiredBookings(client);

    const eventResult = await client.query<EventRow>(
      `SELECT * FROM events WHERE slug = $1 AND is_active = true`,
      [data.slug],
    );
    if (eventResult.rowCount === 0) return { kind: "event_not_found" } as const;
    const event = eventResult.rows[0];

    const reserved = await client.query<{ id: string }>(
      `UPDATE events SET sold = sold + $2
       WHERE id = $1 AND is_active = true AND sold + $2 <= capacity
       RETURNING id`,
      [event.id, data.quantity],
    );
    if (reserved.rowCount === 0) {
      return {
        kind: "sold_out",
        remaining: Math.max(event.capacity - event.sold, 0),
      } as const;
    }

    const reference = generateBookingReference();
    const amount = computeAmount(event.price_minor, data.quantity);

    const booking = (
      await client.query<BookingRow>(
        `INSERT INTO bookings
           (reference, event_id, customer_name, phone, email, quantity,
            unit_price_minor, amount_minor, currency, status, channel,
            payment_method, sold_by, provider, provider_ref, provider_tx_id,
            paid_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PAID', 'GATE',
                 $10, $11, 'gate', $1, $12, now(), now())
         RETURNING *`,
        [
          reference,
          event.id,
          data.customerName,
          data.phone,
          data.email,
          data.quantity,
          event.price_minor,
          amount,
          event.currency,
          data.method,
          soldBy,
          `gate:${reference}`,
        ],
      )
    ).rows[0];

    const tickets: TicketRow[] = [];
    for (let index = 1; index <= data.quantity; index += 1) {
      const ticketId = randomUUID();
      const token = ticketTokenFor(ticketId);
      const label =
        data.quantity === 1
          ? `${data.customerName} · Gate ticket`
          : `${data.customerName} · Guest ${index}/${data.quantity}`;

      const inserted = await client.query<TicketRow>(
        `INSERT INTO tickets
           (id, booking_id, token_hash, admits, attendee_index, attendee_label)
         VALUES ($1, $2, $3, 1, $4, $5)
         RETURNING *`,
        [ticketId, booking.id, hashToken(token), index, label],
      );
      tickets.push(inserted.rows[0]);
    }

    return { kind: "created", booking, event, tickets } as const;
  });
}

export async function listTicketsForReference(reference: string): Promise<TicketRow[]> {
  const result = await query<TicketRow>(
    `SELECT t.*
     FROM tickets t
     JOIN bookings b ON b.id = t.booking_id
     WHERE b.reference = $1
     ORDER BY t.attendee_index`,
    [reference],
  );
  return result.rows;
}
