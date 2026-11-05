import Link from "next/link";
import { listActiveEvents } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let events: EventRow[] = [];
  let databaseDown = false;

  try {
    events = await listActiveEvents();
  } catch {
    databaseDown = true;
  }

  const nextEvent = events[0] ?? null;

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-hot/15 blur-3xl"
        />

        <div className="relative grid gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-hot">
              House party · Friday 6 Nov
            </p>

            <h1 className="display mt-4 text-6xl sm:text-8xl">
              <span className="text-ink">Shots</span>{" "}
              <span className="text-hot glow-hot">and</span>
              <br />
              <span className="text-accent glow-blue">Secrets</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-mute">
              Come for the shots, stay for the secrets. Pay by mobile money and your QR ticket
              lands in your inbox — walk in with a single scan.
            </p>

            <div className="mt-8 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.14em]">
              <Chip>8PM till you drop</Chip>
              <Chip>Drinks on the house</Chip>
              <Chip>Dress code: party comfy</Chip>
            </div>

            {nextEvent ? (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={`/events/${nextEvent.slug}`}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  Get tickets
                  <span aria-hidden>→</span>
                </Link>
                <span className="text-xs text-mute">
                  {formatMoney(nextEvent.price_minor, nextEvent.currency)} per person ·{" "}
                  {Math.max(nextEvent.capacity - nextEvent.sold, 0)} places left
                </span>
              </div>
            ) : null}
          </div>

          {nextEvent ? <PosterCard event={nextEvent} /> : null}
        </div>
      </section>

      <div className="relative -mt-6 overflow-hidden border-y border-line/70 py-3">
        <div className="marquee-track flex w-max items-center gap-6 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.4em] text-mute/60">
          {Array.from({ length: 2 }).map((_, copy) => (
            <span key={copy} className="flex items-center gap-6" aria-hidden={copy === 1}>
              <span>Shots</span>
              <span className="text-hot">✦</span>
              <span>Secrets</span>
              <span className="text-accent">✦</span>
              <span>One QR at the door</span>
              <span className="text-hot">✦</span>
              <span>No queues</span>
              <span className="text-accent">✦</span>
            </span>
          ))}
        </div>
      </div>

      {databaseDown ? (
        <div className="rounded-2xl border border-hot/40 bg-hot-soft p-6 text-sm text-ink">
          <p className="font-medium">The database is not reachable.</p>
          <p className="mt-1 text-mute">
            Start Postgres with <code className="font-mono text-ink">docker compose up -d</code>,
            then run <code className="font-mono text-ink">npm run db:setup</code>.
          </p>
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-mute">
            On sale now
          </h2>
          <span className="text-xs text-mute/70">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => {
            const remaining = Math.max(event.capacity - event.sold, 0);
            const startsAt = new Date(event.starts_at);
            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_18px_60px_-30px_rgba(47,109,255,0.7)]"
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-14 shrink-0 place-items-center rounded-xl border border-line bg-paper text-center">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-hot">
                      {new Intl.DateTimeFormat("en-GB", {
                        month: "short",
                        timeZone: event.timezone,
                      }).format(startsAt)}
                    </span>
                    <span className="display text-2xl leading-none text-ink">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "2-digit",
                        timeZone: event.timezone,
                      }).format(startsAt)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="display text-xl leading-tight text-ink">{event.name}</h3>
                    <p className="mt-1 text-sm text-mute">{event.venue}</p>
                    <p className="text-xs text-mute/70">
                      {new Intl.DateTimeFormat("en-GB", {
                        weekday: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: event.timezone,
                      }).format(startsAt)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                    {formatMoney(event.price_minor, event.currency)}
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-4">
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      remaining > 0 ? "text-mute" : "text-hot"
                    }`}
                  >
                    {remaining > 0 ? `${remaining} places left` : "Sold out"}
                  </p>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent opacity-0 transition group-hover:opacity-100">
                    Book now →
                  </span>
                </div>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition group-hover:opacity-100"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {!databaseDown && events.length === 0 ? (
        <p className="text-sm text-mute">
          No events are on sale. Run <code className="font-mono text-ink">npm run db:setup</code>{" "}
          to seed the demo event.
        </p>
      ) : null}
    </div>
  );
}

function PosterCard({ event }: { event: EventRow }) {
  const startsAt = new Date(event.starts_at);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: event.timezone }).format(startsAt);
  const remaining = Math.max(event.capacity - event.sold, 0);

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        aria-hidden
        className="absolute inset-x-8 -bottom-4 h-24 rounded-full bg-accent/30 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
        <div className="hairline h-px w-full" />
        <div className="flex items-start justify-between gap-4 px-5 pb-5 pt-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-mute">Admission</p>
            <p className="display mt-1 text-6xl leading-none text-ink">
              {format({ day: "2-digit" })}
            </p>
          </div>
          <div className="text-right">
            <p className="display text-xl leading-none text-hot">{format({ month: "short" })}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-mute">
              {format({ weekday: "short" })} · {format({ hour: "2-digit", minute: "2-digit", hour12: false })}
            </p>
          </div>
        </div>

        <div className="border-y border-dashed border-line px-5 py-4">
          <p className="display text-2xl leading-tight text-ink">{event.name}</p>
          <p className="mt-1 text-sm text-mute">{event.venue}</p>
        </div>

        <div className="flex items-center justify-between px-5 py-4 text-xs">
          <span className="rounded-full border border-accent/40 bg-accent-soft px-3 py-1 font-semibold text-accent">
            {formatMoney(event.price_minor, event.currency)}
          </span>
          <span className="uppercase tracking-[0.16em] text-mute">
            {remaining > 0 ? `${remaining} left` : "Sold out"}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-mute">
            Scan at the door
          </span>
          <div
            aria-hidden
            className="h-5 w-24 bg-[repeating-linear-gradient(90deg,#f2f0ea_0_2px,transparent_2px_5px)] opacity-25"
          />
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-paper/60 px-3 py-1.5 text-mute">
      {children}
    </span>
  );
}
