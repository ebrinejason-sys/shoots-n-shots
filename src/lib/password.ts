import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_BYTES = 64;
const SALT_BYTES = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

export { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./password-policy";

// A well-formed hash that no input can produce — verified against when the
// account does not exist, so a miss costs the same as a wrong password.
export const DUMMY_PASSWORD_HASH = [
  "scrypt",
  COST,
  BLOCK_SIZE,
  PARALLELISM,
  Buffer.alloc(SALT_BYTES).toString("base64"),
  Buffer.alloc(KEY_BYTES).toString("base64"),
].join("$");

interface ParsedHash {
  cost: number;
  blockSize: number;
  parallelism: number;
  salt: Buffer;
  key: Buffer;
}

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelism = Number(parts[3]);
  if (!Number.isInteger(cost) || cost < 4096 || cost > 131072) return null;
  if (!Number.isInteger(blockSize) || blockSize < 1 || blockSize > 16) return null;
  if (!Number.isInteger(parallelism) || parallelism < 1 || parallelism > 4) return null;

  try {
    const salt = Buffer.from(parts[4], "base64");
    const key = Buffer.from(parts[5], "base64");
    if (salt.length < 8 || key.length < 16) return null;
    return { cost, blockSize, parallelism, salt, key };
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(plain, salt, KEY_BYTES, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: MAX_MEMORY,
  });
  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;

  const key = await scrypt(plain, parsed.salt, parsed.key.length, {
    N: parsed.cost,
    r: parsed.blockSize,
    p: parsed.parallelism,
    maxmem: MAX_MEMORY,
  });
  return key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
}

export function generateTemporaryPassword(): string {
  return randomBytes(12).toString("base64url");
}
