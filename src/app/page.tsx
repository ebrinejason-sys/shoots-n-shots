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

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-12 sm:px-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-hot/15 blur-3xl"
        />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-hot">
            House party · Friday 6 Nov
          </p>

          <h1 className="display mt-4 text-5xl sm:text-7xl">
            <span className="text-ink">Shots</span>{" "}
            <span className="text-hot glow-hot">and</span>
            <br />
            <span className="text-accent glow-blue">Secrets</span>
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-mute">
            Come for the shots, stay for the secrets. Pay by mobile money, get a QR ticket on
            WhatsApp, and walk in with a single scan.
          </p>

          <div className="mt-8 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.14em]">
            <Chip>8PM till you drop</Chip>
            <Chip>Drinks on the house</Chip>
            <Chip>Dress code: party comfy</Chip>
          </div>
        </div>
      </section>

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
            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-0.5 hover:border-accent/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="display text-xl leading-tight text-ink">{event.name}</h3>
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                    {formatMoney(event.price_minor, event.currency)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-mute">{event.venue}</p>
                <p className="mt-1 text-sm text-mute">
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: event.timezone,
                  }).format(new Date(event.starts_at))}
                </p>
                <p
                  className={`mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                    remaining > 0 ? "text-mute" : "text-hot"
                  }`}
                >
                  {remaining > 0 ? `${remaining} places left` : "Sold out"}
                </p>
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-paper/60 px-3 py-1.5 text-mute">
      {children}
    </span>
  );
}
