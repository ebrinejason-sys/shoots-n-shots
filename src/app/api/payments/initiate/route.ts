import { NextResponse } from "next/server";
import { getBookingContext } from "@/lib/booking";
import { APP_URL, MOCK_PAYMENTS } from "@/lib/config";
import { minorToMajor } from "@/lib/money";
import { initiatePayment } from "@/lib/payments/flutterwave";
import { ticketUrlFor } from "@/lib/tickets";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { reference?: string };
  if (!body.reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const context = await getBookingContext(body.reference);
  if (!context) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (context.booking.status === "PAID") {
    return NextResponse.json({
      mode: "paid",
      ticketUrl: ticketUrlFor(context.booking.id),
    });
  }

  if (MOCK_PAYMENTS) {
    return NextResponse.json({ mode: "mock" });
  }

  try {
    const checkoutUrl = await initiatePayment({
      txRef: context.booking.provider_ref,
      amountMinor: context.booking.amount_minor,
      currency: context.booking.currency,
      email: context.booking.email,
      phone: context.booking.phone,
      name: context.booking.customer_name,
      title: context.event.name,
      redirectUrl: `${APP_URL}/pay/${context.booking.reference}`,
    });
    return NextResponse.json({ mode: "checkout", checkoutUrl });
  } catch (error) {
    console.error("payment init failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment" },
      { status: 502 },
    );
  }
}

// Exposed so the payment page can show the accounting amount in major units.
export async function GET() {
  return NextResponse.json({ mock: MOCK_PAYMENTS, amountExample: minorToMajor(25000, "UGX") });
}
