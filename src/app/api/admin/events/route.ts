import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getStaffSession } from "@/lib/auth";
import { createEvent } from "@/lib/events";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 });
  }

  if (!rateLimit(`events:${clientKey(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many changes, slow down" }, { status: 429 });
  }

  try {
    const result = await createEvent(await request.json());
    if (result.kind !== "ok") {
      return NextResponse.json({ error: "Could not create the event" }, { status: 400 });
    }
    return NextResponse.json({ event: result.event }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Please check the details" },
        { status: 400 },
      );
    }
    console.error("event create failed", error);
    return NextResponse.json({ error: "Could not create the event" }, { status: 500 });
  }
}
