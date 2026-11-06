import { buildQrMatrix, qrToPng } from "../qr";
import { sendEmail } from "./send";
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
    if (!message.email) {
      return { ok: false, detail: "booking has no email address" };
    }

    // Embed the PNG in the message so the code renders even when the app runs
    // on localhost and has no public URL.
    const attachments = message.tickets.map((ticket) => ({
      filename: `ticket-${ticket.index}.png`,
      content: qrToPng(buildQrMatrix(ticket.ticketUrl), { scale: 8, margin: 4 }).toString(
        "base64",
      ),
      content_id: `ticket-qr-${ticket.index}`,
    }));

    const codes = message.tickets
      .map(
        (ticket) => `
        <div style="margin:0 0 24px;padding:16px;border:1px solid #ddd;border-radius:12px">
          <p style="margin:0 0 12px;font-weight:600">${escapeHtml(ticket.label)}</p>
          <img src="cid:ticket-qr-${ticket.index}" alt="Ticket QR code"
               width="220" height="220" style="display:block;border:1px solid #ddd" />
          <p style="margin:12px 0 0">
            <a href="${escapeHtml(ticket.ticketUrl)}">Open this ticket</a>
          </p>
        </div>`,
      )
      .join("");

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px">
        <h2 style="margin:0 0 4px">${escapeHtml(message.eventName)}</h2>
        <p style="color:#555;margin:0 0 16px">${escapeHtml(message.eventVenue)}</p>
        <p>Hi ${escapeHtml(message.customerName)},</p>
        <p>Your booking <strong>${escapeHtml(message.reference)}</strong> is paid:
           ${message.quantity} ticket(s), ${escapeHtml(message.amountLabel)}.</p>
        ${codes}
        <p style="color:#555">Show a code at the entrance. Each code is single use.</p>
      </div>`;

    return sendEmail({
      to: message.email,
      subject: `Your ticket${message.tickets.length > 1 ? "s" : ""} for ${message.eventName}`,
      html,
      attachments,
    });
  },
};
