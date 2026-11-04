import { africasTalking } from "../config";
import type { DeliveryChannel, DeliveryResult } from "./types";

// SMS cannot carry an image, so it delivers the ticket link instead.
export const smsChannel: DeliveryChannel = {
  name: "sms",
  async send(message): Promise<DeliveryResult> {
    if (!africasTalking.username || !africasTalking.apiKey) {
      return { ok: false, detail: "Africa's Talking is not configured" };
    }

    const body = new URLSearchParams({
      username: africasTalking.username,
      to: message.phone,
      message: `${message.eventName}: ${message.quantity} ticket(s), ref ${message.reference}. ${message.ticketUrl}`,
    });
    if (africasTalking.senderId) body.set("from", africasTalking.senderId);

    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey: africasTalking.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, detail: `SMS HTTP ${response.status} ${text.slice(0, 200)}` };
    }
    return { ok: true, detail: "accepted by Africa's Talking" };
  },
};
