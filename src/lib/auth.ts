import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE_SECRET, STAFF_PASSCODE } from "./config";

export const STAFF_COOKIE = "sns_staff";
export const STAFF_SESSION_SECONDS = 12 * 60 * 60;

function sign(payload: string): string {
  return createHmac("sha256", COOKIE_SECRET).update(payload).digest("base64url");
}

export function createStaffToken(label: string, now: number = Date.now()): string {
  const expires = Math.floor(now / 1000) + STAFF_SESSION_SECONDS;
  const payload = `${Buffer.from(label, "utf8").toString("base64url")}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function readStaffToken(
  value: string | undefined,
  now: number = Date.now(),
): { label: string } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [encodedLabel, expires, signature] = parts;
  const expected = sign(`${encodedLabel}.${expires}`);
  const provided = Buffer.from(signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    return null;
  }
  if (Number(expires) * 1000 <= now) return null;

  try {
    return { label: Buffer.from(encodedLabel, "base64url").toString("utf8") };
  } catch {
    return null;
  }
}

export function isValidPasscode(passcode: string): boolean {
  const provided = Buffer.from(passcode);
  const expected = Buffer.from(STAFF_PASSCODE);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function getStaffSession(): Promise<{ label: string } | null> {
  const jar = await cookies();
  return readStaffToken(jar.get(STAFF_COOKIE)?.value);
}

export const staffCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: STAFF_SESSION_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
