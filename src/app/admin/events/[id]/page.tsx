import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventForm, eventToFormValues } from "@/components/EventForm";
import { getStaffSession } from "@/lib/auth";
import { getEventById } from "@/lib/events";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) redirect("/scanner/login");

  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const publicHref = `/events/${event.slug}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Events</p>
          <h1 className="display mt-2 text-4xl leading-none text-ink">{event.name}</h1>
          <p className="tnum mt-2 text-sm text-mute">
            {event.sold} of {event.capacity} sold ·{" "}
            {formatMoney(event.price_minor, event.currency)} ·{" "}
            <span className="font-mono text-xs">/{event.slug}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={publicHref} className="btn-link">
            View public page
          </Link>
          <Link href="/admin/events" className="btn-link">
            ← Events
          </Link>
        </div>
      </div>

      <EventForm mode="edit" initial={eventToFormValues(event)} />
    </div>
  );
}
