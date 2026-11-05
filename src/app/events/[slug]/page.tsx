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
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: event.timezone,
  }).format(startsAt);
  const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: event.timezone }).format(
    startsAt,
  );
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: event.timezone }).format(
    startsAt,
  );
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: event.timezone,
  }).format(startsAt);
  const soldPercent = event.capacity ? Math.round((event.sold / event.capacity) * 100) : 0;

  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/#on-sale" className="btn-link">
            ← All events
          </Link>
          <Steps current={1} />
        </div>

        <p className="eyebrow mt-8">
          <span className="text-hot">{weekday}</span> <span className="text-mute/60">/</span> {day}{" "}
          {month} · <span className="tnum">{time}</span>
        </p>
        <h1 className="display mt-4 text-5xl text-ink sm:text-6xl">{event.name}</h1>
        <p className="mt-5 max-w-lg text-sm leading-relaxed text-mute">{event.description}</p>

        <dl className="mt-10 border-t border-ink">
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
          <Row label="Delivery" value="QR ticket by email" />
        </dl>

        <div className="mt-8">
          <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em]">
            <span className="text-mute">Door progress</span>
            <span className="tnum text-mute">
              {event.sold} of {event.capacity} gone
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-line">
            <div className="h-full bg-ink" style={{ width: `${soldPercent}%` }} />
          </div>
        </div>
      </section>

      <section className="lg:sticky lg:top-28 lg:self-start">
        {remaining > 0 ? (
          <BookingForm
            slug={event.slug}
            priceMinor={event.price_minor}
            currency={event.currency}
            remaining={remaining}
          />
        ) : (
          <div className="border border-line bg-surface p-6 text-sm text-mute">
            This event is sold out. Gate sales on the night are cash only.
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
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mute">{label}</dt>
      <dd className={`text-right text-sm font-medium ${tone === "hot" ? "text-hot" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}
