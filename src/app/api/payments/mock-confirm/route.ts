import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { failBooking, getBookingContext } from "@/lib/booking";
import { MOCK_PAYMENTS } from "@/lib/config";
import { fulfilBooking } from "@/lib/fulfil";
import { ticketUrlFor } from "@/lib/tickets";

/**
 * Development-only stand-in for a Flutterwave webhook. It runs the same
 * fulfilment path, so switching MOCK_PAYMENTS off changes nothing downstream.
 */
export async function POST(request: Request) {
  if (!MOCK_PAYMENTS) {
    return NextResponse.json({ error: "mock payments are disabled" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    reference?: string;
    outcome?: "success" | "decline";
  };

  if (!body.reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const context = await getBookingContext(body.reference);
  if (!context) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (body.outcome === "decline") {
    const failed = await failBooking(body.reference);
    if (!failed) {
      return NextResponse.json(
        { status: context.booking.status.toLowerCase() },
        { status: 409 },
      );
    }
    return NextResponse.json({ status: "failed" });
  }

  const transactionId = `mock_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const result = await fulfilBooking(body.reference, transactionId);

  if (!result) {
    return NextResponse.json(
      { status: context.booking.status.toLowerCase() },
      { status: 409 },
    );
  }

  return NextResponse.json({
    status: "paid",
    ticketUrl: ticketUrlFor(result.booking.id),
  });
}
