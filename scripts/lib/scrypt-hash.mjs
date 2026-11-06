// Mirror of src/lib/password.ts for plain-Node scripts, which cannot import
// TypeScript. tests/password.test.ts pins the two implementations together.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_BYTES = 64;
const SALT_BYTES = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

function parseHash(stored) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelism = Number(parts[3]);
  if (!Number.isInteger(cost) || cost < 4096 || cost > 131072) return null;
  if (!Number.isInteger(blockSize) || blockSize < 1 || blockSize > 16) return null;
  if (!Number.isInteger(parallelism) || parallelism < 1 || parallelism > 4) return null;

  const salt = Buffer.from(parts[4], "base64");
  const key = Buffer.from(parts[5], "base64");
  if (salt.length < 8 || key.length < 16) return null;
  return { cost, blockSize, parallelism, salt, key };
}

export async function hashPassword(plain) {
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

export async function verifyPassword(plain, stored) {
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

export function generateTemporaryPassword() {
  return randomBytes(12).toString("base64url");
}
