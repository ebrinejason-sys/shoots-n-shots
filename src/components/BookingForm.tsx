"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/money";

interface Props {
  slug: string;
  priceMinor: number;
  currency: string;
  remaining: number;
}

export function BookingForm({ slug, priceMinor, currency, remaining }: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQuantity = Math.min(10, remaining);
  const total = priceMinor * quantity;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      slug,
      customerName: form.get("customerName"),
      phone: form.get("phone"),
      email: form.get("email"),
      quantity,
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { reference?: string; error?: string };

      if (!response.ok || !data.reference) {
        setError(data.error ?? "Could not create the booking");
        setPending(false);
        return;
      }
      router.push(`/pay/${data.reference}`);
    } catch {
      setError("Network error — please try again");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-line bg-surface p-6"
    >
      <div>
        <h2 className="display text-lg text-ink">Book your ticket</h2>
        <p className="mt-1 text-sm text-mute">Payment happens on the next step.</p>
      </div>

      <Field label="Full name" hint={null}>
        <input
          name="customerName"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          className="input"
          placeholder="Amina Nakato"
        />
      </Field>

      <Field label="Phone number" hint={null}>
        <input
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          className="input"
          placeholder="+256 700 000 000"
        />
      </Field>

      <Field
        label="Email"
        hint="Required by the payment provider; used to resend your ticket."
      >
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
        />
      </Field>

      <div className="text-sm">
        <span className="text-[11px] uppercase tracking-[0.16em] text-mute">
          Number of tickets
        </span>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="h-10 w-10 rounded-xl border border-line bg-paper text-lg leading-none text-ink transition hover:border-accent disabled:opacity-40"
            aria-label="Fewer tickets"
          >
            −
          </button>
          <span className="w-10 text-center text-lg font-semibold text-ink">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
            className="h-10 w-10 rounded-xl border border-line bg-paper text-lg leading-none text-ink transition hover:border-accent disabled:opacity-40"
            disabled={quantity >= maxQuantity}
            aria-label="More tickets"
          >
            +
          </button>
          <span className="ml-auto text-xs text-mute">max {maxQuantity}</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-dashed border-line pt-4">
        <span className="text-xs uppercase tracking-[0.16em] text-mute">Total</span>
        <span className="text-xl font-semibold text-ink">{formatMoney(total, currency)}</span>
      </div>

      {error ? (
        <p className="rounded-xl border border-hot/40 bg-hot-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
      >
        {pending ? "Creating booking…" : "Continue to payment"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[11px] uppercase tracking-[0.16em] text-mute">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <span className="mt-1.5 block text-xs text-mute/70">{hint}</span> : null}
    </label>
  );
}
