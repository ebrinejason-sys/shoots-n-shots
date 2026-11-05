import { deliveryChannels } from "../config";
import { query } from "../db";
import { consoleChannel } from "./console";
import { emailChannel } from "./email";
import { smsChannel } from "./sms";
import { whatsappChannel } from "./whatsapp";
import type { DeliveryChannel, DeliveryResult, TicketMessage } from "./types";

export type { TicketMessage } from "./types";

const registry: Record<string, DeliveryChannel> = {
  console: consoleChannel,
  whatsapp: whatsappChannel,
  sms: smsChannel,
  email: emailChannel,
};

export function resolveChannels(): DeliveryChannel[] {
  const configured = deliveryChannels.length ? deliveryChannels : ["console"];
  const picked = configured
    .map((name) => registry[name])
    .filter((channel): channel is DeliveryChannel => Boolean(channel));
  return picked.length ? picked : [consoleChannel];
}

/**
 * Runs after the payment transaction commits, so a delivery failure can never
 * roll back a payment. Every attempt is recorded for the admin view.
 */
export async function deliverTicket(
  bookingId: string,
  message: TicketMessage,
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];

  for (const channel of resolveChannels()) {
    // Walk-in customers may not share an address; that is a skip, not a fault.
    if (channel.name === "email" && !message.email) {
      await query(
        `INSERT INTO delivery_outbox (booking_id, channel, status, attempts, last_error)
         VALUES ($1, $2, 'SKIPPED', 0, $3)`,
        [bookingId, channel.name, "booking has no email address"],
      );
      continue;
    }

    let result: DeliveryResult;
    try {
      result = await channel.send(message);
    } catch (error) {
      result = {
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }

    results.push(result);
    await query(
      `INSERT INTO delivery_outbox
         (booking_id, channel, status, attempts, last_error, sent_at)
       VALUES ($1, $2, $3, 1, $4, $5)`,
      [
        bookingId,
        channel.name,
        result.ok ? "SENT" : "FAILED",
        result.ok ? null : result.detail,
        result.ok ? new Date() : null,
      ],
    );
  }

  return results;
}
