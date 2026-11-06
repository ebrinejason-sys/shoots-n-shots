import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createEvent } from "@/lib/events";
import { requireAdmin } from "@/lib/guards";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

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
