import { beforeAll, describe, expect, it } from "vitest";
import {
  DUMMY_PASSWORD_HASH,
  generateTemporaryPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "../src/lib/password";

interface ScryptModule {
  hashPassword(plain: string): Promise<string>;
  verifyPassword(plain: string, stored: string): Promise<boolean>;
}

let scriptModule: ScryptModule;

beforeAll(async () => {
  // Loaded indirectly so TypeScript does not need a declaration for the .mjs.
  const specifier = "../scripts/lib/scrypt-hash.mjs";
  scriptModule = (await import(specifier)) as ScryptModule;
});

describe("password hashing", () => {
  it("round-trips a password", async () => {
    const stored = await hashPassword("test1234");
    expect(stored.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("test1234", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct-horse-battery");
    expect(await verifyPassword("correct-horse-batter", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("salts every hash differently", async () => {
    const first = await hashPassword("test1234");
    const second = await hashPassword("test1234");
    expect(first).not.toBe(second);
    expect(await verifyPassword("test1234", first)).toBe(true);
    expect(await verifyPassword("test1234", second)).toBe(true);
  });

  it("rejects malformed stored values without throwing", async () => {
    expect(await verifyPassword("test1234", "")).toBe(false);
    expect(await verifyPassword("test1234", "bcrypt$whatever")).toBe(false);
    expect(await verifyPassword("test1234", "scrypt$1$2$3$4$5")).toBe(false);
  });

  it("never accepts the dummy hash", async () => {
    expect(await verifyPassword("test1234", DUMMY_PASSWORD_HASH)).toBe(false);
    expect(await verifyPassword("", DUMMY_PASSWORD_HASH)).toBe(false);
  });

  it("generates unique temporary passwords", () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });

  it("has sane length bounds", () => {
    expect(MIN_PASSWORD_LENGTH).toBeLessThan(MAX_PASSWORD_LENGTH);
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
  });
});

describe("seed script compatibility", () => {
  it("accepts a hash produced by the plain-Node script", async () => {
    const stored = await scriptModule.hashPassword("test1234");
    expect(await verifyPassword("test1234", stored)).toBe(true);
    expect(await verifyPassword("test1235", stored)).toBe(false);
  });

  it("produces hashes the plain-Node script accepts", async () => {
    const stored = await hashPassword("test1234");
    expect(await scriptModule.verifyPassword("test1234", stored)).toBe(true);
    expect(await scriptModule.verifyPassword("test1235", stored)).toBe(false);
  });
});
