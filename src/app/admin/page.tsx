import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { RefreshButton } from "@/components/RefreshButton";
import { getAdminTotals, listBookings, listRecentScans } from "@/lib/booking";
import { getStaffSession } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { getSetupStatus } from "@/lib/setup";

export const dynamic = "force-dynamic";

const STATUS_CLASSES: Record<string, string> = {
  PAID: "border-accent/50 bg-accent-soft text-accent",
  PENDING: "border-line bg-paper text-mute",
  FAILED: "border-hot/50 bg-hot-soft text-hot",
  CANCELLED: "border-line bg-paper text-mute",
  REFUNDED: "border-line bg-paper text-mute",
};

const RESULT_CLASSES: Record<string, string> = {
  VALID: "border-accent/50 bg-accent-soft text-accent",
  ALREADY_USED: "border-line bg-paper text-mute",
  UNPAID: "border-hot/50 bg-hot-soft text-hot",
  INVALID: "border-hot/50 bg-hot-soft text-hot",
};

export default async function AdminPage() {
  const session = await getStaffSession();
  if (!session) redirect("/scanner/login");

  const [bookings, scans, totals] = await Promise.all([
    listBookings(40),
    listRecentScans(25),
    getAdminTotals(),
  ]);
  const setup = getSetupStatus();
  const outstanding = setup.filter((item) => !item.done).length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mute">
            Door control
          </p>
          <h1 className="display mt-1 text-3xl leading-none text-ink">Operations</h1>
          <p className="mt-2 text-sm text-mute">Signed in as {session.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/gate" className="btn-primary">
            Sell at gate
          </Link>
          <RefreshButton />
          <LogoutButton />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Paid bookings" value={String(totals.paidBookings)} />
        <Stat label="Tickets sold" value={String(totals.ticketsSold)} />
        <Stat
          label="Revenue"
          value={formatMoney(totals.revenueMinor, totals.currency)}
          highlight
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mute">
            Go-live checklist
          </h2>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              outstanding === 0
                ? "border-accent/50 bg-accent-soft text-accent"
                : "border-hot/50 bg-hot-soft text-hot"
            }`}
          >
            {outstanding === 0 ? "All set" : `${outstanding} to do`}
          </span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {setup.map((item) => (
            <li
              key={item.key}
              className={`rounded-xl border px-4 py-3 ${
                item.done ? "border-accent/30 bg-accent-soft/40" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <span
                  className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    item.done ? "text-accent" : "text-hot"
                  }`}
                >
                  {item.done ? "Ready" : "To do"}
                </span>
              </div>
              <p className="mt-1 text-xs text-mute">{item.detail}</p>
              <p className="mt-1 font-mono text-[10px] text-mute/60">{item.key}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mute">
          Recent bookings
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-[10px] uppercase tracking-[0.14em] text-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Codes</th>
                <th className="px-4 py-3 font-medium">Print</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink">{booking.reference}</td>
                  <td className="px-4 py-3 text-ink">{booking.customer_name}</td>
                  <td className="px-4 py-3 text-mute">{booking.quantity}</td>
                  <td className="px-4 py-3 text-ink">
                    {formatMoney(booking.amount_minor, booking.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        STATUS_CLASSES[booking.status] ?? "border-line bg-paper text-mute"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-mute">
                      {booking.channel === "GATE"
                        ? booking.payment_method === "MOBILE_MONEY"
                          ? "Gate · MoMo"
                          : "Gate · Cash"
                        : "Online"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-mute">
                    {booking.ticket_count === 0
                      ? "—"
                      : `${booking.tickets_used}/${booking.ticket_count} used`}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {booking.ticket_count > 0 ? (
                      <Link
                        href={`/admin/gate/${booking.reference}`}
                        className="font-medium text-accent transition hover:underline"
                      >
                        Print
                      </Link>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-mute">
                    No bookings yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mute">
          Recent scans
        </h2>
        <ul className="space-y-2">
          {scans.map((scan) => (
            <li
              key={scan.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {scan.customer_name ?? "Unknown code"}
                  {scan.reference ? (
                    <span className="ml-2 font-mono text-xs text-mute">{scan.reference}</span>
                  ) : null}
                </p>
                <p className="text-xs text-mute/70">
                  {scan.staff_label ?? "unlabelled"} ·{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(scan.scanned_at))}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  RESULT_CLASSES[scan.result] ?? "border-line bg-paper text-mute"
                }`}
              >
                {scan.result}
              </span>
            </li>
          ))}
          {scans.length === 0 ? (
            <li className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-mute">
              No scans yet.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${highlight ? "text-accent" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
