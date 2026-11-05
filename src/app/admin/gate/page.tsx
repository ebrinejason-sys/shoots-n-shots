import Link from "next/link";
import { redirect } from "next/navigation";
import { GateSaleForm } from "@/components/GateSaleForm";
import { getStaffSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function GateSalePage() {
  const session = await getStaffSession();
  if (!session) redirect("/scanner/login");

  const events = await listActiveEvents();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Door control</p>
          <h1 className="display mt-2 text-4xl leading-none text-ink">Sell at the gate</h1>
          <p className="mt-2 text-sm text-mute">Signed in as {session.label}</p>
        </div>
        <Link href="/admin" className="btn-link">
          ← Operations
        </Link>
      </div>

      {events.length > 0 ? (
        <GateSaleForm
          events={events.map((event) => ({
            slug: event.slug,
            name: event.name,
            priceMinor: event.price_minor,
            currency: event.currency.trim(),
            remaining: Math.max(event.capacity - event.sold, 0),
          }))}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface px-5 py-6 text-sm text-mute">
          <p className="font-medium text-ink">No event is on sale.</p>
          <p className="mt-1">
            Put one on sale first —{" "}
            <Link href="/admin/events/new" className="btn-link">
              create an event
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
