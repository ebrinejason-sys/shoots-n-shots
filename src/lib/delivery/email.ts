import { resend } from "../config";
import type { DeliveryChannel, DeliveryResult } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const emailChannel: DeliveryChannel = {
  name: "email",
  async send(message): Promise<DeliveryResult> {
    if (!resend.apiKey) {
      return { ok: false, detail: "Resend is not configured" };
    }

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px">
        <h2 style="margin:0 0 4px">${escapeHtml(message.eventName)}</h2>
        <p style="color:#555;margin:0 0 16px">${escapeHtml(message.eventVenue)}</p>
        <p>Hi ${escapeHtml(message.customerName)},</p>
        <p>Your booking <strong>${escapeHtml(message.reference)}</strong> is paid:
           ${message.quantity} ticket(s), ${escapeHtml(message.amountLabel)}.</p>
        <p><img src="${escapeHtml(message.qrPngUrl)}" alt="Ticket QR code"
                width="240" height="240" style="border:1px solid #ddd" /></p>
        <p>Show this code at the entrance, or open your ticket:
           <a href="${escapeHtml(message.ticketUrl)}">${escapeHtml(message.ticketUrl)}</a></p>
      </div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resend.from,
        to: message.email,
        subject: `Your ticket for ${message.eventName}`,
        html,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, detail: `Email HTTP ${response.status} ${text.slice(0, 200)}` };
    }
    return { ok: true, detail: "accepted by Resend" };
  },
};
