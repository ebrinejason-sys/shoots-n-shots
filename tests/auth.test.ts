import { describe, expect, it } from "vitest";
import {
  createStaffToken,
  isValidPasscode,
  readStaffToken,
  STAFF_SESSION_SECONDS,
} from "../src/lib/auth";

const NOW = 1_760_000_000_000;

describe("staff session tokens", () => {
  it("round-trips a label", () => {
    const token = createStaffToken("Gate 2 — Sarah", NOW);
    expect(readStaffToken(token, NOW)).toEqual({ label: "Gate 2 — Sarah" });
  });

  it("rejects a tampered label", () => {
    const token = createStaffToken("Gate 2", NOW);
    const [, expires, signature] = token.split(".");
    const forgedLabel = Buffer.from("Gate 1").toString("base64url");
    expect(readStaffToken(`${forgedLabel}.${expires}.${signature}`, NOW)).toBeNull();
  });

  it("rejects a tampered expiry", () => {
    const token = createStaffToken("Gate 2", NOW);
    const [label, , signature] = token.split(".");
    expect(readStaffToken(`${label}.9999999999.${signature}`, NOW)).toBeNull();
  });

  it("expires after the session window", () => {
    const token = createStaffToken("Gate 2", NOW);
    const justBefore = NOW + STAFF_SESSION_SECONDS * 1000 - 1000;
    const justAfter = NOW + STAFF_SESSION_SECONDS * 1000 + 1000;

    expect(readStaffToken(token, justBefore)).toEqual({ label: "Gate 2" });
    expect(readStaffToken(token, justAfter)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(readStaffToken(undefined, NOW)).toBeNull();
    expect(readStaffToken("", NOW)).toBeNull();
    expect(readStaffToken("only-one-part", NOW)).toBeNull();
    expect(readStaffToken("a.b.c.d", NOW)).toBeNull();
  });
});

describe("passcode check", () => {
  it("compares against the configured passcode", () => {
    expect(isValidPasscode(process.env.STAFF_PASSCODE ?? "staff1234")).toBe(true);
  });

  it("rejects wrong and empty passcodes", () => {
    expect(isValidPasscode("wrong")).toBe(false);
    expect(isValidPasscode("")).toBe(false);
    expect(isValidPasscode("staff1234 ")).toBe(false);
  });
});
