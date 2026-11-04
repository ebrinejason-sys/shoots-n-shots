import { createHash, createHmac } from "node:crypto";
import { APP_URL, TICKET_SECRET } from "./config";

export const TOKEN_LENGTH = 32;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

// Derived from the booking id so the ticket URL can be rebuilt at any time
// without storing the token itself. Without TICKET_SECRET the 192 bits are
// unguessable, and a scan still does an indexed lookup by hash.
export function ticketTokenFor(bookingId: string): string {
  return createHmac("sha256", TICKET_SECRET)
    .update(`ticket:${bookingId}`)
    .digest("base64url")
    .slice(0, TOKEN_LENGTH);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function ticketUrlFor(bookingId: string, appUrl: string = APP_URL): string {
  return `${appUrl.replace(/\/+$/, "")}/t/${ticketTokenFor(bookingId)}`;
}

export function qrPngUrlFor(bookingId: string, appUrl: string = APP_URL): string {
  return `${appUrl.replace(/\/+$/, "")}/api/tickets/${ticketTokenFor(bookingId)}/qr`;
}

// Accepts either a bare token or a full ticket URL (a phone's camera app
// opens the URL, while the in-app scanner decodes the same code).
export function extractToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    const index = segments.indexOf("t");
    if (index >= 0 && segments[index + 1]) return segments[index + 1];
    return null;
  } catch {
    return trimmed;
  }
}
