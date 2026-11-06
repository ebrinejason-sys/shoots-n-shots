import Link from "next/link";
import { EventSaleToggle } from "@/components/EventSaleToggle";
import { listAllEvents } from "@/lib/events";
import { requireAdminPage } from "@/lib/guards";
import { formatMoney } from "@/lib/money";
import { eventTone } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const admin = await requireAdminPage();

  const events = await listAllEvents();
  const now = Date.now();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Door control</p>
          <h1 className="display mt-2 text-4xl leading-none text-ink">Events</h1>
          <p className="mt-2 text-sm text-mute">Signed in as {admin.user.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/events/new" className="btn-primary">
            New event
          </Link>
          <Link href="/admin" className="btn-link">
            ← Operations
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-10 text-center">
          <p className="display text-2xl text-ink">No events yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-mute">
            Create one and it appears on the public site immediately, ready for online and gate
            sales.
          </p>
          <Link href="/admin/events/new" className="btn-primary mt-5">
            Create the first event
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-[10px] uppercase tracking-[0.14em] text-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Sold</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Sale</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const past = new Date(event.starts_at).getTime() < now;
                return (
                  <tr key={event.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 ${eventTone(event.slug).bg}`}
                          aria-hidden
                        />
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="font-medium text-ink hover:text-accent"
                        >
                          {event.name}
                        </Link>
                      </span>
                      <p className="text-xs text-mute">{event.venue}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-mute">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: event.timezone,
                      }).format(new Date(event.starts_at))}
                      {past ? (
                        <span className="ml-1 uppercase tracking-[0.12em] text-mute/60">past</span>
                      ) : null}
                    </td>
                    <td className="tnum px-4 py-3 text-ink">
                      {formatMoney(event.price_minor, event.currency)}
                    </td>
                    <td className="tnum px-4 py-3 text-mute">
                      {event.sold}/{event.capacity}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          event.is_active
                            ? "border-accent/50 bg-accent-soft text-accent"
                            : "border-line bg-paper text-mute"
                        }`}
                      >
                        {event.is_active ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <EventSaleToggle id={event.id} isActive={event.is_active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
