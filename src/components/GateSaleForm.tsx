"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/money";

export interface GateEventOption {
  slug: string;
  name: string;
  priceMinor: number;
  currency: string;
  remaining: number;
}

interface Props {
  events: GateEventOption[];
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

export function GateSaleForm({ events }: Props) {
  const [slug, setSlug] = useState(events[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"CASH" | "MOBILE_MONEY">("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sale, setSale] = useState<SaleResult | null>(null);

  const selected = events.find((event) => event.slug === slug) ?? events[0];
  const max = Math.min(10, Math.max(selected.remaining, 1));
  const total = formatMoney(selected.priceMinor * quantity, selected.currency);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/gate-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selected.slug,
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
        <section className="space-y-4 rounded-2xl border border-accent/40 bg-accent-soft p-6">
          <div>
            <p className="eyebrow text-accent">Paid at the gate · {sale.amountLabel}</p>
            <h2 className="display mt-3 text-2xl leading-none text-ink">
              {sale.quantity} {sale.quantity === 1 ? "code" : "codes"} issued
            </h2>
            <p className="mt-2 text-sm text-mute">
              Ref <span className="font-mono text-xs text-ink">{sale.reference}</span>
              {email ? ` · emailed to ${email}` : ""}
            </p>
          </div>

          <Link href={sale.printUrl} className="btn-primary no-print w-full">
            Open print sheet
          </Link>
        </section>

        <div className="space-y-2">
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
                className="rounded-sm bg-white p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{ticket.label}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-mute">{ticket.token}</p>
                <p className="mt-1 text-xs text-mute/70">Single use · admits one guest</p>
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
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-surface p-6">
      <div>
        <p className="eyebrow text-hot">Walk-in</p>
        <h2 className="display mt-2 text-3xl leading-none text-ink">{selected.name}</h2>
        <p className="tnum mt-2 text-sm text-mute">
          {formatMoney(selected.priceMinor, selected.currency)} each · {selected.remaining} left
        </p>
      </div>

      {events.length > 1 ? (
        <label className="block space-y-1.5">
          <span className="eyebrow">Event</span>
          <select
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setQuantity(1);
            }}
            className="input"
          >
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block space-y-1.5">
        <span className="eyebrow">Full name</span>
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
        <span className="eyebrow">Email — the QR is sent here</span>
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
        <span className="eyebrow">Phone (optional)</span>
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
          <span className="eyebrow">Guests</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              className="h-11 w-11 rounded-sm border border-line text-lg text-mute transition hover:border-ink hover:text-ink disabled:opacity-40"
            >
              −
            </button>
            <span className="tnum w-10 text-center text-lg font-semibold text-ink">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(max, value + 1))}
              disabled={quantity >= max}
              className="h-11 w-11 rounded-sm border border-line text-lg text-mute transition hover:border-ink hover:text-ink disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="eyebrow">Payment</span>
          <div className="grid grid-cols-2 gap-2">
            {(["CASH", "MOBILE_MONEY"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMethod(option)}
                className={`h-11 rounded-sm border text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                  method === option
                    ? "border-accent bg-accent text-white"
                    : "border-line text-mute hover:border-ink hover:text-ink"
                }`}
              >
                {option === "CASH" ? "Cash" : "Mobile money"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-dashed border-line pt-4">
        <span className="eyebrow">Total collected</span>
        <span className="tnum text-xl font-semibold text-ink">{total}</span>
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
