import { timingSafeEqual } from "node:crypto";
import { flutterwave } from "../config";
import { minorToMajor } from "../money";

export interface InitiateInput {
  txRef: string;
  amountMinor: number;
  currency: string;
  email: string;
  phone: string;
  name: string;
  title: string;
  redirectUrl: string;
}

interface PaymentInitResponse {
  status?: string;
  message?: string;
  data?: { link?: string };
}

export async function initiatePayment(input: InitiateInput): Promise<string> {
  if (!flutterwave.secretKey) {
    throw new Error("FLUTTERWAVE_SECRET_KEY is not configured");
  }

  const response = await fetch(`${flutterwave.baseUrl}/v3/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${flutterwave.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: input.txRef,
      // Flutterwave expects major units; the accounting stays in minor units.
      amount: minorToMajor(input.amountMinor, input.currency),
      currency: input.currency.trim().toUpperCase(),
      redirect_url: input.redirectUrl,
      payment_options: "mobilemoney,card,banktransfer",
      customer: {
        email: input.email,
        phonenumber: input.phone,
        name: input.name,
      },
      customizations: {
        title: input.title,
        description: "Event ticket",
      },
      // Mirrored back by the dashboard and the webhook so a payment can be
      // traced even when the customer closes the browser before redirecting.
      meta: { reference: input.txRef },
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as PaymentInitResponse;
  if (!response.ok || payload.status !== "success" || !payload.data?.link) {
    throw new Error(
      `Flutterwave checkout failed: ${payload.message ?? `HTTP ${response.status}`}`,
    );
  }
  return payload.data.link;
}

export interface VerifiedTransaction {
  transactionId: string;
  txRef: string;
  amount: number;
  currency: string;
  status: string;
  paymentType: string;
}

interface VerifyResponse {
  status?: string;
  message?: string;
  data?: {
    id?: number | string;
    tx_ref?: string;
    amount?: number | string;
    currency?: string;
    status?: string;
    payment_type?: string;
  };
}

export async function verifyTransactionById(
  id: string | number,
): Promise<VerifiedTransaction | null> {
  if (!flutterwave.secretKey) {
    throw new Error("FLUTTERWAVE_SECRET_KEY is not configured");
  }

  const response = await fetch(
    `${flutterwave.baseUrl}/v3/transactions/${encodeURIComponent(String(id))}/verify`,
    {
      headers: { Authorization: `Bearer ${flutterwave.secretKey}` },
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as VerifyResponse;
  if (!response.ok || payload.status !== "success" || !payload.data) return null;

  const data = payload.data;
  return {
    transactionId: String(data.id ?? ""),
    txRef: String(data.tx_ref ?? ""),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? ""),
    status: String(data.status ?? ""),
    paymentType: String(data.payment_type ?? ""),
  };
}

export interface ExpectedTransaction {
  txRef: string;
  amountMajor: number;
  currency: string;
}

export function isSuccessfulTransaction(
  transaction: VerifiedTransaction | null,
  expected: ExpectedTransaction,
): boolean {
  if (!transaction) return false;
  return (
    transaction.status === "successful" &&
    transaction.txRef === expected.txRef &&
    transaction.currency.trim().toUpperCase() === expected.currency.trim().toUpperCase() &&
    transaction.amount + 1e-9 >= expected.amountMajor
  );
}

// v3 sends the dashboard secret verbatim in `verif-hash`; this is not an HMAC.
export function verifyWebhookSignature(header: string | null): boolean {
  if (!header || !flutterwave.webhookSecret) return false;
  const provided = Buffer.from(header);
  const expected = Buffer.from(flutterwave.webhookSecret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
