import { randomBytes } from "node:crypto";

// No 0/O/1/I so a reference read over the phone cannot be mistyped.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBookingReference(): string {
  const bytes = randomBytes(8);
  let body = "";
  for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length];
  return `SNS-${body}`;
}

export const BOOKING_REFERENCE_PATTERN = /^SNS-[A-Z2-9]{8}$/;

export function generateProviderRef(reference: string): string {
  return `${reference.toLowerCase()}_${randomBytes(6).toString("hex")}`;
}
