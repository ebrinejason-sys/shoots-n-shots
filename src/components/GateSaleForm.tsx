"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/money";

interface Props {
  slug: string;
  eventName: string;
  priceMinor: number;
  currency: string;
  priceLabel: string;
  remaining: number;
}

interface SaleTicket {
  index: number;
  label: string | null;
  token: string;
  ticketUrl: string;
  qrUrl: string;
}

interface SaleResult {
  reference: string;
  quantity: number;
  amountLabel: string;
  printUrl: string;
  tickets: SaleTicket[];
}

export function GateSaleForm(props: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"CASH" | "MOBILE_MONEY">("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sale, setSale] = useState<SaleResult | null>(null);

  const max = Math.min(10, Math.max(props.remaining, 1));
  const total = formatMoney(props.priceMinor * quantity, props.currency);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/gate-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: props.slug,
          customerName: name,
          email,
          phone,
          quantity,
          method,
        }),
      });
      const data = (await response.json()) as SaleResult & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not record the sale");
        return;
      }
      setSale(data);
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSale(null);
    setName("");
    setEmail("");
    setPhone("");
    setQuantity(1);
    setMethod("CASH");
    setError(null);
  }

  if (sale) {
    return (
      <div className="space-y-4">
        <section className="relative space-y-4 overflow-hidden rounded-2xl border border-accent/50 bg-surface p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-accent/30 blur-3xl"
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              Paid at the gate · {sale.amountLabel}
            </p>
            <h2 className="display mt-2 text-2xl leading-none text-ink">
              {sale.quantity} {sale.quantity === 1 ? "code" : "codes"} issued
            </h2>
            <p className="mt-2 text-sm text-mute">
              Ref <span className="font-mono text-xs text-ink">{sale.reference}</span>
              {email ? ` · emailed to ${email}` : ""}
            </p>
          </div>

          <Link href={sale.printUrl} className="btn-primary no-print relative block text-center">
            Open print sheet
          </Link>
        </section>

        <div className="space-y-3">
          {sale.tickets.map((ticket) => (
            <div
              key={ticket.index}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ticket.qrUrl}
                alt={`QR code for ${ticket.label ?? "ticket"}`}
                width={96}
                height={96}
                className="rounded-lg bg-white p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{ticket.label}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-mute">{ticket.token}</p>
                <p className="mt-1 text-xs text-mute/70">
                  Single use · admits one guest
                </p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={reset} className="btn-ghost no-print w-full">
          New sale
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-hot">Walk-in</p>
        <h2 className="display mt-1 text-2xl leading-none text-ink">{props.eventName}</h2>
        <p className="mt-2 text-sm text-mute">
          {props.priceLabel} each · {props.remaining} left
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-mute">Full name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          className="input"
          placeholder="Who is paying?"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-mute">
          Email — the QR is sent here
        </span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          className="input"
          placeholder="guest@example.com"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-mute">
          Phone (optional)
        </span>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          type="tel"
          className="input"
          placeholder="+256…"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-mute">Guests</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              className="h-11 w-11 rounded-xl border border-line text-lg text-mute transition hover:border-accent/60 hover:text-ink disabled:opacity-40"
            >
              −
            </button>
            <span className="w-10 text-center text-lg font-semibold text-ink">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(max, value + 1))}
              disabled={quantity >= max}
              className="h-11 w-11 rounded-xl border border-line text-lg text-mute transition hover:border-accent/60 hover:text-ink disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-mute">Payment</span>
          <div className="grid grid-cols-2 gap-2">
            {(["CASH", "MOBILE_MONEY"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMethod(option)}
                className={`h-11 rounded-xl border text-xs font-semibold uppercase tracking-[0.1em] transition ${
                  method === option
                    ? "border-accent/60 bg-accent-soft text-accent"
                    : "border-line text-mute hover:border-accent/40 hover:text-ink"
                }`}
              >
                {option === "CASH" ? "Cash" : "Mobile money"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-dashed border-line pt-4">
        <span className="text-[11px] uppercase tracking-[0.14em] text-mute">Total collected</span>
        <span className="text-xl font-semibold text-accent">{total}</span>
      </div>

      {error ? (
        <p className="rounded-xl border border-hot/40 bg-hot-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Recording…" : `Record sale · ${total}`}
      </button>
      <p className="text-center text-xs text-mute/70">
        Each guest gets their own single-use QR, printed and emailed immediately.
      </p>
    </form>
  );
}
