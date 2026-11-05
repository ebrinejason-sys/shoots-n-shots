import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/BookingForm";
import { Steps } from "@/components/Steps";
import { getEventBySlug } from "@/lib/booking";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const remaining = Math.max(event.capacity - event.sold, 0);
  const startsAt = new Date(event.starts_at);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-[0.16em] text-mute transition hover:text-ink"
          >
            ← All events
          </Link>
          <Steps current={1} />
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-hot">
              {new Intl.DateTimeFormat("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: event.timezone,
              }).format(startsAt)}
            </p>
            <h1 className="display mt-3 text-5xl leading-none text-ink sm:text-6xl">
              {event.name}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              {event.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
              <span className="rounded-full border border-line bg-paper/60 px-3 py-1.5">
                {event.venue}
              </span>
              <span className="rounded-full border border-line bg-paper/60 px-3 py-1.5">
                {formatMoney(event.price_minor, event.currency)} per ticket
              </span>
              <span className="rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-accent">
                QR ticket by email
              </span>
            </div>
          </div>
        </div>

        <dl className="divide-y divide-line rounded-2xl border border-line bg-surface px-6 text-sm">
          <Row label="Venue" value={event.venue} />
          <Row
            label="Doors"
            value={new Intl.DateTimeFormat("en-GB", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: event.timezone,
            }).format(startsAt)}
          />
          <Row label="Price" value={`${formatMoney(event.price_minor, event.currency)} per ticket`} />
          <Row
            label="Availability"
            value={remaining > 0 ? `${remaining} of ${event.capacity} left` : "Sold out"}
            tone={remaining > 0 ? "default" : "hot"}
          />
        </dl>

        <div className="rounded-2xl border border-line bg-surface px-6 py-5">
          <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em]">
            <span className="text-mute">Door progress</span>
            <span className={remaining > 0 ? "text-mute" : "text-hot"}>
              {event.sold} of {event.capacity} gone
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-hot"
              style={{ width: `${event.capacity ? Math.round((event.sold / event.capacity) * 100) : 0}%` }}
            />
          </div>
        </div>
      </section>

      <section className="lg:sticky lg:top-24 lg:self-start">
        {remaining > 0 ? (
          <BookingForm
            slug={event.slug}
            priceMinor={event.price_minor}
            currency={event.currency}
            remaining={remaining}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-mute">
            This event is sold out.
          </div>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "hot";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-mute">{label}</dt>
      <dd
        className={`text-right font-medium ${tone === "hot" ? "text-hot" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
