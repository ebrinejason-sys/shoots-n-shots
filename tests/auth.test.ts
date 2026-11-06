import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createAdminToken,
  createStaffToken,
  isValidPasscode,
  readStaffToken,
  STAFF_SESSION_SECONDS,
} from "../src/lib/auth";
import { COOKIE_SECRET } from "../src/lib/config";

const NOW = 1_760_000_000_000;
const EXPIRES = Math.floor(NOW / 1000) + STAFF_SESSION_SECONDS;

function signClaims(claims: Record<string, unknown>, expires: number = EXPIRES): string {
  const body = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const payload = `${body}.${expires}`;
  const signature = createHmac("sha256", COOKIE_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

describe("staff session tokens", () => {
  it("round-trips a passcode label", () => {
    const token = createStaffToken("Gate 2 — Sarah", NOW);
    expect(readStaffToken(token, NOW)).toEqual({ kind: "staff", label: "Gate 2 — Sarah" });
  });

  it("round-trips an admin session", () => {
    const token = createAdminToken(
      { userId: "6f1a0f36-3f9f-4b8f-9e6f-1a2b3c4d5e6f", version: 3, label: "Moses Ayiel" },
      NOW,
    );
    expect(readStaffToken(token, NOW)).toEqual({
      kind: "admin",
      userId: "6f1a0f36-3f9f-4b8f-9e6f-1a2b3c4d5e6f",
      version: 3,
      label: "Moses Ayiel",
    });
  });

  it("rejects a tampered label", () => {
    const token = createStaffToken("Gate 2", NOW);
    const [, expires, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ k: "staff", l: "Gate 1" })).toString("base64url");
    expect(readStaffToken(`${forged}.${expires}.${signature}`, NOW)).toBeNull();
  });

  it("rejects a tampered expiry", () => {
    const token = createStaffToken("Gate 2", NOW);
    const [body, , signature] = token.split(".");
    expect(readStaffToken(`${body}.9999999999.${signature}`, NOW)).toBeNull();
  });

  it("rejects an admin session downgraded to staff", () => {
    const token = createAdminToken({ userId: "abc", version: 1, label: "Moses" }, NOW);
    const [, expires, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ k: "staff", l: "Moses" })).toString("base64url");
    expect(readStaffToken(`${forged}.${expires}.${signature}`, NOW)).toBeNull();
  });

  it("expires after the session window", () => {
    const token = createStaffToken("Gate 2", NOW);
    const justBefore = NOW + STAFF_SESSION_SECONDS * 1000 - 1000;
    const justAfter = NOW + STAFF_SESSION_SECONDS * 1000 + 1000;

    expect(readStaffToken(token, justBefore)).toEqual({ kind: "staff", label: "Gate 2" });
    expect(readStaffToken(token, justAfter)).toBeNull();
  });

  it("rejects well-signed claims of an unknown shape", () => {
    expect(readStaffToken(signClaims({ k: "owner", l: "Someone" }), NOW)).toBeNull();
    expect(readStaffToken(signClaims({ k: "admin", l: "No id", v: 1 }), NOW)).toBeNull();
    expect(readStaffToken(signClaims({ k: "admin", u: "id", v: "1", l: "Bad" }), NOW)).toBeNull();
    expect(readStaffToken(signClaims({ k: "staff" }), NOW)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(readStaffToken(undefined, NOW)).toBeNull();
    expect(readStaffToken("", NOW)).toBeNull();
    expect(readStaffToken("only-one-part", NOW)).toBeNull();
    expect(readStaffToken("a.b.c.d", NOW)).toBeNull();
    expect(readStaffToken("not-json.9999999999.signature", NOW)).toBeNull();
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
