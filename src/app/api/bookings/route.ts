import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createBooking } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(`book:${clientKey(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts, try again shortly" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const result = await createBooking(body);

    if (result.kind === "event_not_found") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (result.kind === "sold_out") {
      return NextResponse.json(
        {
          error:
            result.remaining > 0
              ? `Only ${result.remaining} ticket(s) left`
              : "This event is sold out",
        },
        { status: 409 },
      );
    }

    const { booking } = result;
    return NextResponse.json(
      {
        reference: booking.reference,
        quantity: booking.quantity,
        amountMinor: booking.amount_minor,
        currency: booking.currency.trim(),
        amountLabel: formatMoney(booking.amount_minor, booking.currency),
        paymentUrl: `/pay/${booking.reference}`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Please check your details" },
        { status: 400 },
      );
    }
    console.error("booking failed", error);
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }
}
