import { describe, expect, it } from "vitest";
import {
  BOOKING_REFERENCE_PATTERN,
  generateBookingReference,
  generateProviderRef,
} from "../src/lib/refs";

describe("booking references", () => {
  it("matches the documented format", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateBookingReference()).toMatch(BOOKING_REFERENCE_PATTERN);
    }
  });

  it("avoids characters that get misread aloud", () => {
    const refs = Array.from({ length: 400 }, () => generateBookingReference()).join("");
    expect(refs).not.toMatch(/[01IO]/);
  });

  it("does not repeat", () => {
    const refs = new Set(Array.from({ length: 500 }, () => generateBookingReference()));
    expect(refs.size).toBe(500);
  });
});

describe("provider references", () => {
  it("derives from the booking reference and stays unique", () => {
    const reference = generateBookingReference();
    const first = generateProviderRef(reference);
    const second = generateProviderRef(reference);

    expect(first.startsWith(`${reference.toLowerCase()}_`)).toBe(true);
    expect(first).toMatch(/^sns-[a-z2-9]{8}_[0-9a-f]{12}$/);
    expect(first).not.toBe(second);
  });
});
