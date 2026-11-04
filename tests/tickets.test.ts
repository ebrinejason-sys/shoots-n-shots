import { describe, expect, it } from "vitest";
import {
  extractToken,
  hashToken,
  qrPngUrlFor,
  ticketTokenFor,
  ticketUrlFor,
  TOKEN_PATTERN,
} from "../src/lib/tickets";

const BOOKING_ID = "8d4f6a2e-1c3b-4a5d-9e7f-6b8c9d0e1f2a";

describe("ticket tokens", () => {
  it("is deterministic for a booking", () => {
    expect(ticketTokenFor(BOOKING_ID)).toBe(ticketTokenFor(BOOKING_ID));
    expect(ticketTokenFor(BOOKING_ID)).not.toBe(ticketTokenFor(`${BOOKING_ID}x`));
  });

  it("has the expected shape", () => {
    const token = ticketTokenFor(BOOKING_ID);
    expect(token).toHaveLength(32);
    expect(token).toMatch(TOKEN_PATTERN);
  });

  it("hashes to a stable 64-char digest", () => {
    const token = ticketTokenFor(BOOKING_ID);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(hashToken(ticketTokenFor(`${BOOKING_ID}x`)));
  });

  it("builds ticket and QR URLs from the same token", () => {
    const token = ticketTokenFor(BOOKING_ID);
    expect(ticketUrlFor(BOOKING_ID, "https://tickets.example.com/")).toBe(
      `https://tickets.example.com/t/${token}`,
    );
    expect(qrPngUrlFor(BOOKING_ID, "https://tickets.example.com")).toBe(
      `https://tickets.example.com/api/tickets/${token}/qr`,
    );
  });
});

describe("extracting a token from scanner input", () => {
  const token = ticketTokenFor(BOOKING_ID);

  it("accepts a bare token, trimmed", () => {
    expect(extractToken(`  ${token}  `)).toBe(token);
  });

  it("accepts a full ticket URL", () => {
    expect(extractToken(`https://tickets.example.com/t/${token}`)).toBe(token);
    expect(extractToken(`http://localhost:3000/t/${token}/`)).toBe(token);
  });

  it("rejects unrelated URLs", () => {
    expect(extractToken("https://example.com/hello")).toBeNull();
    expect(extractToken("https://example.com/t/")).toBeNull();
  });

  it("returns null for blank input", () => {
    expect(extractToken("   ")).toBeNull();
  });
});
