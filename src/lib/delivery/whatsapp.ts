import { whatsapp } from "../config";
import type { DeliveryChannel, DeliveryResult } from "./types";

export function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

// Business-initiated messages need an approved template unless the customer
// messaged first. With WHATSAPP_TEMPLATE_NAME set we send the template;
// otherwise we attempt a free-form image, which only succeeds inside an open
// 24-hour window and is reported as a failure otherwise.
export const whatsappChannel: DeliveryChannel = {
  name: "whatsapp",
  async send(message): Promise<DeliveryResult> {
    if (!whatsapp.token || !whatsapp.phoneNumberId) {
      return { ok: false, detail: "WhatsApp is not configured" };
    }

    const to = normalisePhone(message.phone);
    if (!to) return { ok: false, detail: "booking has no usable phone number" };

    const payload = whatsapp.templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: whatsapp.templateName,
            language: { code: "en" },
            components: [
              {
                type: "header",
                parameters: [{ type: "image", image: { link: message.qrPngUrl } }],
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: message.customerName },
                  { type: "text", text: message.eventName },
                  { type: "text", text: String(message.quantity) },
                  { type: "text", text: message.reference },
                ],
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "image",
          image: {
            link: message.qrPngUrl,
            caption: `${message.eventName} — ${message.quantity} ticket(s), ref ${message.reference}\n${message.ticketUrl}`,
          },
        };

    const response = await fetch(
      `https://graph.facebook.com/${whatsapp.apiVersion}/${whatsapp.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsapp.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      messages?: { id?: string }[];
    };

    if (!response.ok) {
      return {
        ok: false,
        detail: body.error?.message ?? `WhatsApp HTTP ${response.status}`,
      };
    }
    return { ok: true, detail: `message ${body.messages?.[0]?.id ?? "accepted"}` };
  },
};
