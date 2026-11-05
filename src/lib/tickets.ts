import { createHash, createHmac } from "node:crypto";
import { APP_URL, TICKET_SECRET } from "./config";

export const TOKEN_LENGTH = 32;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

// Derived from the ticket id so the URL can be rebuilt without storing the
// token itself, and every attendee's ticket gets a distinct code. Without
// TICKET_SECRET the 192 bits are unguessable, and a scan still does an indexed
// lookup by hash.
export function ticketTokenFor(ticketId: string): string {
  return createHmac("sha256", TICKET_SECRET)
    .update(`ticket:${ticketId}`)
    .digest("base64url")
    .slice(0, TOKEN_LENGTH);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function ticketUrlFor(ticketId: string, appUrl: string = APP_URL): string {
  return `${appUrl.replace(/\/+$/, "")}/t/${ticketTokenFor(ticketId)}`;
}

export function qrPngUrlFor(ticketId: string, appUrl: string = APP_URL): string {
  return `${appUrl.replace(/\/+$/, "")}/api/tickets/${ticketTokenFor(ticketId)}/qr`;
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
