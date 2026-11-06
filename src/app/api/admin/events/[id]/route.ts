import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { updateEvent } from "@/lib/events";
import { requireAdmin } from "@/lib/guards";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (!rateLimit(`events:${clientKey(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many changes, slow down" }, { status: 429 });
  }

  const { id } = await params;

  try {
    const result = await updateEvent(id, await request.json());

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (result.kind === "capacity_below_sold") {
      return NextResponse.json(
        { error: `${result.sold} tickets are already sold — capacity cannot go below that` },
        { status: 409 },
      );
    }

    return NextResponse.json({ event: result.event });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Please check the details" },
        { status: 400 },
      );
    }
    console.error("event update failed", error);
    return NextResponse.json({ error: "Could not save the event" }, { status: 500 });
  }
}
