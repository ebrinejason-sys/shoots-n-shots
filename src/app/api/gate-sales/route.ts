import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveAppUrl } from "@/lib/app-url";
import { getStaffSession } from "@/lib/auth";
import { deliverTicket } from "@/lib/delivery";
import { buildTicketMessage } from "@/lib/fulfil";
import { createGateSale } from "@/lib/gate";
import { formatMoney } from "@/lib/money";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { ticketTokenFor, ticketUrlFor } from "@/lib/tickets";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 });
  }

  if (!rateLimit(`gate:${clientKey(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many gate sales, slow down" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const result = await createGateSale(body, session.label);

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

    const { booking, event, tickets } = result;
    const appUrl = await resolveAppUrl();
    const message = buildTicketMessage(booking, event, tickets, appUrl);

    try {
      await deliverTicket(booking.id, message);
    } catch (error) {
      // The sale is already committed; a mail outage must not undo it.
      console.error("gate ticket delivery failed", error);
    }

    return NextResponse.json(
      {
        reference: booking.reference,
        quantity: booking.quantity,
        amountLabel: formatMoney(booking.amount_minor, booking.currency),
        printUrl: `/admin/gate/${booking.reference}`,
        tickets: tickets.map((ticket) => ({
          index: ticket.attendee_index,
          label: ticket.attendee_label,
          token: ticketTokenFor(ticket.id),
          ticketUrl: ticketUrlFor(ticket.id, appUrl),
          qrUrl: `/api/tickets/${ticketTokenFor(ticket.id)}/qr`,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Please check the details" },
        { status: 400 },
      );
    }
    console.error("gate sale failed", error);
    return NextResponse.json({ error: "Could not record the sale" }, { status: 500 });
  }
}
