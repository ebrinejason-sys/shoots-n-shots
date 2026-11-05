import Link from "next/link";
import { listUpcomingEvents } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import { eventTone } from "@/lib/tone";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatters(timezone: string) {
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: timezone }),
    day: new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: timezone }),
    month: new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: timezone }),
    monthShort: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: timezone }),
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }),
  };
}

export default async function HomePage() {
  let events: EventRow[] = [];
  let databaseDown = false;

  try {
    events = await listUpcomingEvents();
  } catch {
    databaseDown = true;
  }

  const nextEvent = events[0] ?? null;

  return (
    <div className="space-y-16">
      <section className="grid gap-10 border-b border-line pb-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        {nextEvent ? <NextEventHero event={nextEvent} /> : <FallbackHero />}
        {nextEvent ? <TicketStub event={nextEvent} /> : null}
      </section>

      {databaseDown ? (
        <p className="border-l-2 border-hot pl-4 text-sm text-mute">
          Tickets are temporarily unavailable. Please check back in a moment.
        </p>
      ) : null}

      <section id="on-sale" className="scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3">
          <h2 className="eyebrow text-ink">On sale now</h2>
          <span className="tnum text-[11px] uppercase tracking-[0.16em] text-mute">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>

        {events.length > 0 ? (
          <ol className="divide-y divide-line">
            {events.map((event, index) => (
              <li key={event.id}>
                <EventRowItem event={event} index={index} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="py-12">
            <p className="display text-3xl text-ink">Tickets aren&apos;t on sale yet</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-mute">
              The next night is being put together. Tickets go live here first — no account needed,
              just an email for your QR.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function NextEventHero({ event }: { event: EventRow }) {
  const startsAt = new Date(event.starts_at);
  const f = formatters(event.timezone);
  const remaining = Math.max(event.capacity - event.sold, 0);
  const tone = eventTone(event.slug);

  return (
    <div>
      <div className={`mb-6 h-1.5 w-16 ${tone.bg}`} aria-hidden />
      <p className="eyebrow">
        <span className={tone.text}>{f.weekday.format(startsAt)}</span>{" "}
        <span className="text-mute/60">/</span> {f.day.format(startsAt)} {f.month.format(startsAt)}
      </p>
      <h1 className="display mt-5 text-6xl text-ink sm:text-7xl lg:text-8xl">{event.name}</h1>
      <p className="mt-6 max-w-lg text-sm leading-relaxed text-mute">
        {event.description}
      </p>

      <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <dt className="eyebrow">Venue</dt>
          <dd className="mt-1 text-ink">{event.venue}</dd>
        </div>
        <div>
          <dt className="eyebrow">Doors</dt>
          <dd className="tnum mt-1 text-ink">
            {f.weekday.format(startsAt)} · {f.time.format(startsAt)}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">From</dt>
          <dd className="tnum mt-1 text-ink">
            {formatMoney(event.price_minor, event.currency)}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        {remaining > 0 ? (
          <>
            <Link href={`/events/${event.slug}`} className="btn-primary">
              Get tickets
              <span aria-hidden>→</span>
            </Link>
            <span className="tnum text-xs uppercase tracking-[0.14em] text-mute">
              {remaining} of {event.capacity} places left
            </span>
          </>
        ) : (
          <span className="rounded-sm border border-hot px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-hot">
            Sold out
          </span>
        )}
      </div>
    </div>
  );
}

function FallbackHero() {
  return (
    <div>
      <p className="eyebrow">Tickets</p>
      <h1 className="display mt-5 text-6xl text-ink sm:text-7xl lg:text-8xl">
        Shots <span className="italic text-accent">&amp;</span> Secrets
      </h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-mute">
        One night, one ticket, one scan at the door. Pay by mobile money and your QR arrives by
        email.
      </p>
    </div>
  );
}

function TicketStub({ event }: { event: EventRow }) {
  const startsAt = new Date(event.starts_at);
  const f = formatters(event.timezone);
  const remaining = Math.max(event.capacity - event.sold, 0);
  const tone = eventTone(event.slug);

  return (
    <div className="ticket-edge relative w-full max-w-sm justify-self-start bg-surface shadow-[6px_6px_0_0_#E0D8C9] lg:justify-self-end">
      <div className={`flex items-start justify-between gap-4 px-6 py-5 text-white ${tone.bg}`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75">
            Admission
          </p>
          <p className="display tnum mt-2 text-6xl leading-none">{f.day.format(startsAt)}</p>
        </div>
        <div className="text-right">
          <p className="display text-2xl leading-none">{f.monthShort.format(startsAt)}</p>
          <p className="tnum mt-2 text-[10px] uppercase tracking-[0.2em] text-white/75">
            {f.weekday.format(startsAt)} · {f.time.format(startsAt)}
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 pt-5">
        <div className="border-t border-dashed border-line pt-4">
          <p className="display text-2xl leading-tight text-ink">{event.name}</p>
          <p className="mt-1 text-sm text-mute">{event.venue}</p>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="eyebrow">Price</p>
            <p className="tnum mt-1 text-xl font-semibold text-ink">
              {formatMoney(event.price_minor, event.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Left</p>
            <p className="tnum mt-1 text-xl font-semibold text-ink">
              {remaining > 0 ? remaining : "—"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
          <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-mute">
            Scan at the door
          </span>
          <span
            aria-hidden
            className="h-5 w-24 bg-[repeating-linear-gradient(90deg,#141210_0_2px,transparent_2px_5px)] opacity-70"
          />
        </div>
      </div>
    </div>
  );
}

function EventRowItem({ event, index }: { event: EventRow; index: number }) {
  const startsAt = new Date(event.starts_at);
  const f = formatters(event.timezone);
  const remaining = Math.max(event.capacity - event.sold, 0);
  const tone = eventTone(event.slug);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-wrap items-center gap-x-6 gap-y-3 py-6 transition hover:bg-surface/70"
    >
      <span className="tnum w-7 text-xs text-mute/60">{String(index + 1).padStart(2, "0")}</span>

      <div className={`w-24 shrink-0 border-l-[3px] px-3 py-2 ${tone.border} ${tone.soft}`}>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.text}`}>
          {f.monthShort.format(startsAt)}
        </p>
        <p className="display tnum text-3xl leading-none text-ink">{f.day.format(startsAt)}</p>
      </div>

      <div className="min-w-[12rem] flex-1">
        <p className="display text-2xl leading-tight text-ink">{event.name}</p>
        <p className="mt-1 text-xs text-mute">
          {event.venue} · <span className="tnum">{f.weekday.format(startsAt)} {f.time.format(startsAt)}</span>
        </p>
      </div>

      <div className="text-right">
        <p className="tnum text-sm font-semibold text-ink">
          {formatMoney(event.price_minor, event.currency)}
        </p>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
            remaining > 0 ? "text-mute" : "text-hot"
          }`}
        >
          {remaining > 0 ? `${remaining} left` : "Sold out"}
        </p>
      </div>

      <span className="btn-primary ml-auto sm:ml-0">Get tickets</span>
    </Link>
  );
}
