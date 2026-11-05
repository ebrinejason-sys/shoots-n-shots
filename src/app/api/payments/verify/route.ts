import { NextResponse } from "next/server";
import { getBookingContext } from "@/lib/booking";
import { MOCK_PAYMENTS } from "@/lib/config";
import { fulfilBooking } from "@/lib/fulfil";
import { minorToMajor } from "@/lib/money";
import {
  isSuccessfulTransaction,
  verifyTransactionById,
} from "@/lib/payments/flutterwave";
import { ticketUrlFor } from "@/lib/tickets";

/**
 * Called after Flutterwave redirects the customer back. The query string is
 * never trusted: the transaction is verified against the Flutterwave API.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const transactionId = url.searchParams.get("transaction_id");

  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const context = await getBookingContext(reference);
  if (!context) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (context.booking.status === "PAID") {
    return NextResponse.json({
      status: "paid",
      ticketUrl: context.ticketId ? ticketUrlFor(context.ticketId) : null,
    });
  }

  if (context.booking.status === "FAILED" || context.booking.status === "CANCELLED") {
    return NextResponse.json({ status: "failed" });
  }

  if (MOCK_PAYMENTS || !transactionId) {
    return NextResponse.json({ status: "pending" });
  }

  try {
    const transaction = await verifyTransactionById(transactionId);
    const ok = isSuccessfulTransaction(transaction, {
      txRef: context.booking.provider_ref,
      amountMajor: minorToMajor(context.booking.amount_minor, context.booking.currency),
      currency: context.booking.currency,
    });

    if (!ok || !transaction) {
      return NextResponse.json({ status: "pending" });
    }

    const result = await fulfilBooking(reference, transaction.transactionId);
    if (!result) return NextResponse.json({ status: "pending" });

    return NextResponse.json({
      status: "paid",
      ticketUrl: ticketUrlFor(result.ticket.id),
    });
  } catch (error) {
    console.error("payment verification failed", error);
    return NextResponse.json({ status: "pending" }, { status: 502 });
  }
}
