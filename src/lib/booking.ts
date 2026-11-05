import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./db";
import { generateBookingReference, generateProviderRef } from "./refs";
import { computeAmount } from "./money";
import { hashToken, ticketTokenFor } from "./tickets";
import { PENDING_BOOKING_MINUTES } from "./config";
import type { BookingRow, EventRow, TicketRow } from "./types";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]{6,30}$/;

export const bookingInputSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number"),
  email: z.string().trim().max(200).regex(EMAIL_PATTERN, "Enter a valid email"),
  quantity: z.coerce.number().int().min(1).max(10),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export type CreateBookingResult =
  | { kind: "created"; booking: BookingRow; event: EventRow }
  | { kind: "sold_out"; remaining: number }
  | { kind: "event_not_found" };

/**
 * Returns capacity held by abandoned PENDING bookings. Called at the start of
 * booking and scan requests; the prototype has no background worker.
 */
export async function releaseExpiredBookings(client: PoolClient): Promise<number> {
  const result = await client.query(
    `WITH expired AS (
       UPDATE bookings SET status = 'CANCELLED'
       WHERE status = 'PENDING' AND expires_at < now()
       RETURNING event_id, quantity
     ), totals AS (
       SELECT event_id, SUM(quantity)::int AS quantity
       FROM expired
       GROUP BY event_id
     )
     UPDATE events e
     SET sold = GREATEST(e.sold - totals.quantity, 0)
     FROM totals
     WHERE e.id = totals.event_id
     RETURNING e.id`,
  );
  return result.rowCount ?? 0;
}

export async function createBooking(input: unknown): Promise<CreateBookingResult> {
  const data = bookingInputSchema.parse(input);

  return withTransaction(async (client) => {
    await releaseExpiredBookings(client);

    const eventResult = await client.query<EventRow>(
      `SELECT * FROM events WHERE slug = $1 AND is_active = true`,
      [data.slug],
    );
    if (eventResult.rowCount === 0) return { kind: "event_not_found" } as const;
    const event = eventResult.rows[0];

    // Reserve capacity in one statement; counting first would oversell under
    // concurrent checkouts.
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
    const providerRef = generateProviderRef(reference);
    const amount = computeAmount(event.price_minor, data.quantity);

    const inserted = await client.query<BookingRow>(
      `INSERT INTO bookings
         (reference, event_id, customer_name, phone, email, quantity,
          unit_price_minor, amount_minor, currency, provider_ref, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               now() + make_interval(mins => $11::int))
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
        providerRef,
        PENDING_BOOKING_MINUTES,
      ],
    );

    return { kind: "created", booking: inserted.rows[0], event } as const;
  });
}

export interface ConfirmResult {
  booking: BookingRow;
  event: EventRow;
  ticket: TicketRow;
  alreadyConfirmed: boolean;
}

/**
 * The single idempotent confirmation path used by the webhook, the redirect
 * verifier and mock mode. Safe to call repeatedly for the same booking.
 */
export async function confirmBooking(
  reference: string,
  providerTxId: string,
): Promise<ConfirmResult | null> {
  try {
    return await withTransaction(async (client) => {
    const updated = await client.query<BookingRow>(
      `UPDATE bookings
       SET status = 'PAID', paid_at = now(), provider_tx_id = $2
       WHERE reference = $1 AND status = 'PENDING'
       RETURNING *`,
      [reference, providerTxId],
    );

    let booking: BookingRow;
    let alreadyConfirmed = false;

    if (updated.rowCount === 1) {
      booking = updated.rows[0];
    } else {
      const existing = await client.query<BookingRow>(
        `SELECT * FROM bookings WHERE reference = $1`,
        [reference],
      );
      if (existing.rowCount === 0) return null;
      booking = existing.rows[0];
      if (booking.status !== "PAID") return null;
      alreadyConfirmed = true;
    }

    const event = (
      await client.query<EventRow>(`SELECT * FROM events WHERE id = $1`, [booking.event_id])
    ).rows[0];

    let ticket: TicketRow;
    if (alreadyConfirmed) {
      const found = await client.query<TicketRow>(
        `SELECT * FROM tickets WHERE booking_id = $1`,
        [booking.id],
      );
      if (found.rowCount === 0) {
        throw new Error("paid booking is missing its ticket");
      }
      ticket = found.rows[0];
    } else {
      const ticketId = randomUUID();
      const token = ticketTokenFor(ticketId);
      ticket = (
        await client.query<TicketRow>(
          `INSERT INTO tickets
             (id, booking_id, token_hash, admits, attendee_index, attendee_label)
           VALUES ($1, $2, $3, $4, 1, $5)
           RETURNING *`,
          [ticketId, booking.id, hashToken(token), booking.quantity, booking.customer_name],
        )
      ).rows[0];
    }

    return { booking, event, ticket, alreadyConfirmed };
  });
  } catch (error) {
    // The same provider transaction may only ever confirm one booking.
    if ((error as { code?: string }).code === "23505") return null;
    throw error;
  }
}

export async function failBooking(reference: string): Promise<BookingRow | null> {
  return withTransaction(async (client) => {
    const updated = await client.query<BookingRow>(
      `UPDATE bookings SET status = 'FAILED'
       WHERE reference = $1 AND status = 'PENDING'
       RETURNING *`,
      [reference],
    );
    if (updated.rowCount === 0) return null;

    const booking = updated.rows[0];
    await client.query(
      `UPDATE events SET sold = GREATEST(sold - $2, 0) WHERE id = $1`,
      [booking.event_id, booking.quantity],
    );
    return booking;
  });
}

export interface BookingContext {
  booking: BookingRow;
  event: EventRow;
  hasTicket: boolean;
  ticketId: string | null;
  ticketStatus: string | null;
  ticketAdmits: number | null;
}

export async function getBookingContext(reference: string): Promise<BookingContext | null> {
  const result = await query<
    BookingRow & {
      event_row: EventRow;
      ticket_id: string | null;
      ticket_status: string | null;
      ticket_admits: number | null;
    }
  >(
    `SELECT b.*,
            to_jsonb(e.*) AS event_row,
            t.id AS ticket_id,
            t.status AS ticket_status,
            t.admits AS ticket_admits
     FROM bookings b
     JOIN events e ON e.id = b.event_id
     LEFT JOIN LATERAL (
       SELECT id, status, admits
       FROM tickets
       WHERE booking_id = b.id
       ORDER BY attendee_index
       LIMIT 1
     ) t ON true
     WHERE b.reference = $1`,
    [reference],
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  return {
    booking: row,
    event: row.event_row,
    hasTicket: row.ticket_id !== null,
    ticketId: row.ticket_id,
    ticketStatus: row.ticket_status,
    ticketAdmits: row.ticket_admits,
  };
}

export async function findBookingByProviderRef(
  providerRef: string,
): Promise<BookingRow | null> {
  const result = await query<BookingRow>(
    `SELECT * FROM bookings WHERE provider_ref = $1`,
    [providerRef],
  );
  return result.rows[0] ?? null;
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const result = await query<EventRow>(
    `SELECT * FROM events WHERE slug = $1 AND is_active = true`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function listActiveEvents(): Promise<EventRow[]> {
  const result = await query<EventRow>(
    `SELECT * FROM events WHERE is_active = true ORDER BY starts_at ASC`,
  );
  return result.rows;
}

/** What the public home page sells: active events that have not finished. */
export async function listUpcomingEvents(): Promise<EventRow[]> {
  const result = await query<EventRow>(
    `SELECT * FROM events
     WHERE is_active = true AND starts_at > now() - interval '6 hours'
     ORDER BY starts_at ASC`,
  );
  return result.rows;
}

export interface AdminBookingRow extends BookingRow {
  event_name: string;
  ticket_count: number;
  tickets_used: number;
  ticket_status: string | null;
}

export async function listBookings(limit = 50): Promise<AdminBookingRow[]> {
  // A gate sale has one ticket per attendee, so joining directly would repeat
  // the booking row. Aggregate instead.
  const result = await query<AdminBookingRow>(
    `SELECT b.*, e.name AS event_name,
            COALESCE(t.ticket_count, 0)::int AS ticket_count,
            COALESCE(t.tickets_used, 0)::int AS tickets_used,
            t.ticket_status
     FROM bookings b
     JOIN events e ON e.id = b.event_id
     LEFT JOIN LATERAL (
       SELECT count(*)::int AS ticket_count,
              count(*) FILTER (WHERE status = 'USED')::int AS tickets_used,
              (array_agg(status ORDER BY attendee_index))[1] AS ticket_status
       FROM tickets
       WHERE booking_id = b.id
     ) t ON true
     ORDER BY b.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export interface AdminTotals {
  paidBookings: number;
  ticketsSold: number;
  revenueMinor: number;
  currency: string;
}

export async function getAdminTotals(): Promise<AdminTotals> {
  const result = await query<AdminTotals>(
    `SELECT count(*)::int AS "paidBookings",
            COALESCE(SUM(quantity), 0)::int AS "ticketsSold",
            COALESCE(SUM(amount_minor), 0)::bigint AS "revenueMinor",
            COALESCE(MAX(currency), 'UGX') AS currency
     FROM bookings
     WHERE status = 'PAID'`,
  );
  return result.rows[0];
}

export interface AdminScanRow {
  id: string;
  result: string;
  staff_label: string | null;
  scanned_at: Date;
  customer_name: string | null;
  reference: string | null;
}

export async function listRecentScans(limit = 30): Promise<AdminScanRow[]> {
  const result = await query<AdminScanRow>(
    `SELECT s.id, s.result, s.staff_label, s.scanned_at,
            b.customer_name, b.reference
     FROM scan_logs s
     LEFT JOIN tickets t ON t.id = s.ticket_id
     LEFT JOIN bookings b ON b.id = t.booking_id
     ORDER BY s.scanned_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}
