import type { PoolClient } from "pg";
import { withTransaction } from "./db";
import { extractToken, hashToken, TOKEN_PATTERN } from "./tickets";
import { releaseExpiredBookings } from "./booking";
import type { ScanOutcome } from "./types";

export interface ScanReport {
  outcome: ScanOutcome;
  message: string;
  customerName?: string;
  eventName?: string;
  reference?: string;
  quantity?: number;
  usedAt?: string;
  scannedAt: string;
}

async function logScan(
  client: PoolClient,
  ticketId: string | null,
  tokenHash: string,
  result: ScanOutcome,
  staffLabel: string,
): Promise<void> {
  await client.query(
    `INSERT INTO scan_logs (ticket_id, token_hash, result, staff_label)
     VALUES ($1, $2, $3, $4)`,
    [ticketId, tokenHash, result, staffLabel],
  );
}

export async function scanTicket(rawCode: string, staffLabel: string): Promise<ScanReport> {
  const scannedAt = new Date().toISOString();
  const token = extractToken(rawCode);

  if (!token || !TOKEN_PATTERN.test(token)) {
    return {
      outcome: "INVALID",
      message: "Not a recognised ticket code.",
      scannedAt,
    };
  }

  const tokenHash = hashToken(token);

  return withTransaction(async (client) => {
    await releaseExpiredBookings(client);

    const found = await client.query<{
      ticket_id: string;
      ticket_status: string;
      used_at: Date | null;
      booking_status: string;
      customer_name: string;
      reference: string;
      quantity: number;
      event_name: string;
    }>(
      `SELECT t.id AS ticket_id,
              t.status AS ticket_status,
              t.used_at,
              b.status AS booking_status,
              b.customer_name,
              b.reference,
              b.quantity,
              e.name AS event_name
       FROM tickets t
       JOIN bookings b ON b.id = t.booking_id
       JOIN events e ON e.id = b.event_id
       WHERE t.token_hash = $1`,
      [tokenHash],
    );

    if (found.rowCount === 0) {
      await logScan(client, null, tokenHash, "INVALID", staffLabel);
      return {
        outcome: "INVALID" as const,
        message: "No ticket matches this code.",
        scannedAt,
      };
    }

    const row = found.rows[0];
    const details = {
      customerName: row.customer_name,
      eventName: row.event_name,
      reference: row.reference,
      quantity: row.quantity,
      scannedAt,
    };

    if (row.booking_status !== "PAID") {
      await logScan(client, row.ticket_id, tokenHash, "UNPAID", staffLabel);
      return {
        ...details,
        outcome: "UNPAID" as const,
        message: "Payment has not been confirmed for this booking.",
      };
    }

    if (row.ticket_status === "VOID") {
      await logScan(client, row.ticket_id, tokenHash, "INVALID", staffLabel);
      return {
        ...details,
        outcome: "INVALID" as const,
        message: "This ticket has been voided.",
      };
    }

    // Conditional update makes double entry impossible: a concurrent scan
    // blocks, then re-evaluates the WHERE clause and matches zero rows.
    const marked = await client.query<{ used_at: Date }>(
      `UPDATE tickets
       SET status = 'USED', used_at = now()
       WHERE id = $1 AND status = 'VALID'
       RETURNING used_at`,
      [row.ticket_id],
    );

    if (marked.rowCount === 0) {
      const current = await client.query<{ used_at: Date | null }>(
        `SELECT used_at FROM tickets WHERE id = $1`,
        [row.ticket_id],
      );
      const usedAt = current.rows[0]?.used_at ?? row.used_at;
      await logScan(client, row.ticket_id, tokenHash, "ALREADY_USED", staffLabel);
      return {
        ...details,
        outcome: "ALREADY_USED" as const,
        message: "This ticket has already been used.",
        usedAt: usedAt ? new Date(usedAt).toISOString() : undefined,
      };
    }

    await logScan(client, row.ticket_id, tokenHash, "VALID", staffLabel);
    return {
      ...details,
      outcome: "VALID" as const,
      message: `Admit ${row.quantity} ${row.quantity === 1 ? "guest" : "guests"}.`,
      usedAt: new Date(marked.rows[0].used_at).toISOString(),
    };
  });
}

export interface TicketView {
  status: "VALID" | "USED" | "VOID";
  usedAt: Date | null;
  customerName: string;
  reference: string;
  quantity: number;
  amountMinor: number;
  currency: string;
  bookingStatus: string;
  eventName: string;
  eventVenue: string;
  eventStartsAt: Date;
  eventTimezone: string;
}

export async function getTicketView(token: string): Promise<TicketView | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const tokenHash = hashToken(token);
  const result = await withTransaction(async (client) => {
    return client.query<TicketView>(
      `SELECT t.status,
              t.used_at AS "usedAt",
              b.customer_name AS "customerName",
              b.reference,
              b.quantity,
              b.amount_minor AS "amountMinor",
              b.currency,
              b.status AS "bookingStatus",
              e.name AS "eventName",
              e.venue AS "eventVenue",
              e.starts_at AS "eventStartsAt",
              e.timezone AS "eventTimezone"
       FROM tickets t
       JOIN bookings b ON b.id = t.booking_id
       JOIN events e ON e.id = b.event_id
       WHERE t.token_hash = $1`,
      [tokenHash],
    );
  });
  return result.rows[0] ?? null;
}
