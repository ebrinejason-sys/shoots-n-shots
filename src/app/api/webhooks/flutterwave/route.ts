import { NextResponse } from "next/server";
import { failBooking, findBookingByProviderRef, getBookingContext } from "@/lib/booking";
import { fulfilBooking } from "@/lib/fulfil";
import { minorToMajor } from "@/lib/money";
import {
  isSuccessfulTransaction,
  verifyTransactionById,
  verifyWebhookSignature,
} from "@/lib/payments/flutterwave";

interface WebhookPayload {
  event?: string;
  data?: {
    id?: number | string;
    tx_ref?: string;
    status?: string;
  };
}

export async function POST(request: Request) {
  if (!verifyWebhookSignature(request.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as WebhookPayload;
  if (payload.event !== "charge.completed" || !payload.data?.status) {
    return NextResponse.json({ received: true });
  }

  const transactionId = payload.data.id;
  const txRef = payload.data.tx_ref;
  if (transactionId === undefined || !txRef) {
    return NextResponse.json({ received: true });
  }

  // Never trust the webhook body: re-verify the transaction against the API.
  const transaction = await verifyTransactionById(transactionId);
  if (!transaction) {
    return NextResponse.json({ received: true });
  }

  const booking = await findBookingByProviderRef(txRef);
  if (!booking) {
    return NextResponse.json({ received: true });
  }

  // A verified transaction for someone else's reference must not touch this booking.
  if (transaction.txRef !== txRef) {
    return NextResponse.json({ received: true });
  }

  if (transaction.status === "failed" || transaction.status === "cancelled") {
    await failBooking(booking.reference);
    return NextResponse.json({ received: true });
  }

  const context = await getBookingContext(booking.reference);
  if (!context) {
    return NextResponse.json({ received: true });
  }

  const ok = isSuccessfulTransaction(transaction, {
    txRef,
    amountMajor: minorToMajor(context.booking.amount_minor, context.booking.currency),
    currency: context.booking.currency,
  });
  if (!ok) {
    return NextResponse.json({ received: true });
  }

  await fulfilBooking(context.booking.reference, transaction.transactionId);
  return NextResponse.json({ received: true });
}
