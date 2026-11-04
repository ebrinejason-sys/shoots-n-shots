import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentPanel } from "@/components/PaymentPanel";
import { Steps } from "@/components/Steps";
import { getBookingContext } from "@/lib/booking";
import { MOCK_PAYMENTS } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { ticketUrlFor } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ transaction_id?: string; status?: string }>;
}) {
  const { reference } = await params;
  const query = await searchParams;
  const context = await getBookingContext(reference);
  if (!context) notFound();

  const { booking, event } = context;
  const ticketUrl = ticketUrlFor(booking.id);
  const transactionId = query.transaction_id ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/events/${event.slug}`}
            className="text-xs font-medium uppercase tracking-[0.16em] text-mute transition hover:text-ink"
          >
            ← Back to the event
          </Link>
          <Steps current={2} />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-hot/15 blur-3xl"
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-hot">
              Order summary
            </p>
            <h1 className="display mt-2 text-2xl leading-tight text-ink">{event.name}</h1>
            <p className="mt-1 text-sm text-mute">
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: event.timezone,
              }).format(new Date(event.starts_at))}
            </p>
            <p className="text-sm text-mute">{event.venue}</p>

            <dl className="mt-5 space-y-3 border-t border-dashed border-line pt-5 text-sm">
              <Row
                label="Booking reference"
                value={<span className="font-mono text-xs">{booking.reference}</span>}
              />
              <Row label="Name" value={booking.customer_name} />
              <Row label="Phone" value={booking.phone} />
              <Row label="Tickets" value={String(booking.quantity)} />
              <Row
                label="Total"
                value={
                  <span className="text-base font-semibold text-accent">
                    {formatMoney(booking.amount_minor, booking.currency)}
                  </span>
                }
              />
            </dl>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-mute/70">
          Booking held for 20 minutes while payment completes. Unpaid bookings release their
          tickets automatically.
        </p>
      </section>

      <PaymentPanel
        reference={booking.reference}
        initialStatus={booking.status}
        mock={MOCK_PAYMENTS}
        ticketUrl={ticketUrl}
        transactionId={transactionId}
        eventName={event.name}
        quantity={booking.quantity}
        amountLabel={formatMoney(booking.amount_minor, booking.currency)}
        phone={booking.phone}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[11px] uppercase tracking-[0.14em] text-mute">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
