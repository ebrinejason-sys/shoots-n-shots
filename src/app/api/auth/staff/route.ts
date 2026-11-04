import { NextResponse } from "next/server";
import {
  STAFF_COOKIE,
  createStaffToken,
  isValidPasscode,
  staffCookieOptions,
} from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(`staff-login:${clientKey(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts, try again shortly" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    passcode?: string;
    label?: string;
  };

  if (!body.passcode || !isValidPasscode(body.passcode)) {
    return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
  }

  const label = (body.label ?? "").trim().slice(0, 60) || "Gate staff";
  const response = NextResponse.json({ ok: true, label });
  response.cookies.set(STAFF_COOKIE, createStaffToken(label), staffCookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_COOKIE, "", { ...staffCookieOptions, maxAge: 0 });
  return response;
}
