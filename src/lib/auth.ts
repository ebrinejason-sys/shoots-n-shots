import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE_SECRET, STAFF_PASSCODE } from "./config";

export const STAFF_COOKIE = "sns_staff";
export const STAFF_SESSION_SECONDS = 12 * 60 * 60;

/** A gate scanner who signed in with the shared passcode. */
export interface StaffSession {
  kind: "staff";
  label: string;
}

/** A named admin. `version` must match `admin_users.session_version` to stay valid. */
export interface AdminSession {
  kind: "admin";
  userId: string;
  version: number;
  label: string;
}

export type Session = StaffSession | AdminSession;

function sign(payload: string): string {
  return createHmac("sha256", COOKIE_SECRET).update(payload).digest("base64url");
}

function encode(claims: Record<string, unknown>, now: number): string {
  const expires = Math.floor(now / 1000) + STAFF_SESSION_SECONDS;
  const body = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signed = `${body}.${expires}`;
  return `${signed}.${sign(signed)}`;
}

export function createStaffToken(label: string, now: number = Date.now()): string {
  return encode({ k: "staff", l: label }, now);
}

export function createAdminToken(
  input: { userId: string; version: number; label: string },
  now: number = Date.now(),
): string {
  return encode({ k: "admin", u: input.userId, v: input.version, l: input.label }, now);
}

function parseClaims(encoded: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readStaffToken(value: string | undefined, now: number = Date.now()): Session | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [encoded, expires, signature] = parts;
  const expected = sign(`${encoded}.${expires}`);
  const provided = Buffer.from(signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    return null;
  }
  if (Number(expires) * 1000 <= now) return null;

  const claims = parseClaims(encoded);
  if (!claims) return null;
  if (typeof claims.l !== "string") return null;

  if (claims.k === "staff") {
    return { kind: "staff", label: claims.l };
  }
  if (claims.k === "admin") {
    if (typeof claims.u !== "string" || claims.u.length === 0) return null;
    if (typeof claims.v !== "number" || !Number.isInteger(claims.v)) return null;
    return { kind: "admin", userId: claims.u, version: claims.v, label: claims.l };
  }
  return null;
}

export function isValidPasscode(passcode: string): boolean {
  const provided = Buffer.from(passcode);
  const expected = Buffer.from(STAFF_PASSCODE);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/** Any signed session — passcode staff or a named admin. */
export async function getStaffSession(): Promise<Session | null> {
  const jar = await cookies();
  return readStaffToken(jar.get(STAFF_COOKIE)?.value);
}

/** Admin sessions only, straight from the cookie. No database lookup. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getStaffSession();
  return session?.kind === "admin" ? session : null;
}

export const staffCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: STAFF_SESSION_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
