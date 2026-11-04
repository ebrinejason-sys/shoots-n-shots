import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { scanTicket } from "@/lib/scan";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to scan tickets" }, { status: 401 });
  }

  if (!rateLimit(`scan:${clientKey(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many scans, slow down" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { code?: string };
  if (!body.code || !body.code.trim()) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const report = await scanTicket(body.code, session.label);
  return NextResponse.json(report);
}
