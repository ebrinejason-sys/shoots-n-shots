import Link from "next/link";
import { redirect } from "next/navigation";
import { GateSaleForm } from "@/components/GateSaleForm";
import { getStaffSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/booking";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function GateSalePage() {
  const session = await getStaffSession();
  if (!session) redirect("/scanner/login");

  const events = await listActiveEvents();
  const event = events[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mute">
            Door control
          </p>
          <h1 className="display mt-1 text-3xl leading-none text-ink">Sell at the gate</h1>
          <p className="mt-2 text-sm text-mute">Signed in as {session.label}</p>
        </div>
        <Link
          href="/admin"
          className="text-xs font-medium uppercase tracking-[0.16em] text-mute transition hover:text-ink"
        >
          ← Operations
        </Link>
      </div>

      {event ? (
        <GateSaleForm
          slug={event.slug}
          eventName={event.name}
          priceMinor={event.price_minor}
          currency={event.currency.trim()}
          priceLabel={formatMoney(event.price_minor, event.currency)}
          remaining={Math.max(event.capacity - event.sold, 0)}
        />
      ) : (
        <p className="rounded-2xl border border-line bg-surface px-5 py-6 text-sm text-mute">
          There is no active event to sell tickets for.
        </p>
      )}
    </div>
  );
}
