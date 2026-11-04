"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  reference: string;
  initialStatus: string;
  mock: boolean;
  ticketUrl: string;
  transactionId: string | null;
  eventName: string;
  quantity: number;
  amountLabel: string;
  phone: string;
}

export function PaymentPanel(props: Props) {
  const [status, setStatus] = useState(props.initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.transactionId || status === "PAID") return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/payments/verify?reference=${encodeURIComponent(props.reference)}` +
            `&transaction_id=${encodeURIComponent(props.transactionId as string)}`,
        );
        const data = (await response.json()) as { status?: string };
        if (!cancelled && data.status === "paid") setStatus("PAID");
      } catch {
        // The webhook will still confirm it; nothing to do here.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.reference, props.transactionId, status]);

  async function startPayment() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: props.reference }),
      });
      const data = (await response.json()) as {
        mode?: string;
        checkoutUrl?: string;
        error?: string;
      };

      if (data.mode === "paid") {
        setStatus("PAID");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.error ?? "Could not start payment");
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  async function mockConfirm(outcome: "success" | "decline") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/mock-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: props.reference, outcome }),
      });
      const data = (await response.json()) as { status?: string; error?: string };

      if (data.status === "paid") {
        setStatus("PAID");
        return;
      }
      if (data.status === "failed") {
        setStatus("FAILED");
        return;
      }
      setError(data.error ?? "Payment could not be completed");
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  if (status === "PAID") {
    const whatsappHref = `https://wa.me/${props.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
      `My ticket for ${props.eventName} (${props.quantity} ticket(s), ref ${props.reference})`,
    )}`;

    return (
      <section className="relative space-y-4 overflow-hidden rounded-2xl border border-accent/50 bg-surface p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-accent/30 blur-3xl"
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            Payment confirmed
          </p>
          <h2 className="display mt-2 text-3xl leading-none text-ink">
            You&apos;re on the list
          </h2>
          <p className="mt-2 text-sm text-mute">
            {props.quantity} ticket(s) · {props.amountLabel} · ref{" "}
            <span className="font-mono text-xs text-ink">{props.reference}</span>
          </p>
        </div>

        <Link href={props.ticketUrl} className="btn-primary relative block text-center">
          Open your ticket
        </Link>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost relative block text-center"
        >
          Send it to me on WhatsApp
        </a>

        <p className="relative text-xs text-mute/70">
          The ticket was also queued on the configured delivery channels. Keep the link — it is
          your entry pass.
        </p>
      </section>
    );
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return (
      <section className="space-y-3 rounded-2xl border border-hot/50 bg-hot-soft p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-hot">
          Payment failed
        </p>
        <h2 className="display text-2xl leading-none text-ink">No entry this time</h2>
        <p className="text-sm text-mute">
          This booking is closed and its tickets have been released.
        </p>
        <Link href="/" className="inline-block text-sm font-medium text-accent hover:underline">
          Start a new booking
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mute">
          Step 2 of 3
        </p>
        <h2 className="display mt-2 text-2xl leading-none text-ink">
          Pay {props.amountLabel}
        </h2>
        <p className="mt-2 text-sm text-mute">
          {props.mock
            ? "Mock payments are on. Approving here runs the same confirmation path as a real mobile-money callback."
            : "You will be redirected to Flutterwave to pay by mobile money or card."}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-hot/40 bg-hot-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {props.mock ? (
        <div className="space-y-2">
          <button onClick={() => mockConfirm("success")} disabled={busy} className="btn-primary w-full">
            {busy ? "Confirming…" : "Approve payment (test)"}
          </button>
          <button
            onClick={() => mockConfirm("decline")}
            disabled={busy}
            className="w-full rounded-xl border border-line px-4 py-3 text-sm font-medium text-mute transition hover:border-hot/60 hover:text-hot disabled:opacity-60"
          >
            Decline payment (test)
          </button>
        </div>
      ) : (
        <button onClick={startPayment} disabled={busy} className="btn-primary w-full">
          {busy ? "Opening checkout…" : "Pay with Flutterwave"}
        </button>
      )}

      <div className="rounded-xl border border-line bg-paper px-4 py-3 text-xs text-mute">
        <p className="font-medium text-ink">Demo card / mobile money</p>
        <p className="mt-1">
          The amount is fixed server-side at {props.amountLabel}; the browser never sends a price.
        </p>
      </div>
    </section>
  );
}
