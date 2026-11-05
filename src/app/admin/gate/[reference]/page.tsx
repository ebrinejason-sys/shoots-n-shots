import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { resolveAppUrl } from "@/lib/app-url";
import { getStaffSession } from "@/lib/auth";
import { getBookingContext } from "@/lib/booking";
import { listTicketsForReference } from "@/lib/gate";
import { formatMoney } from "@/lib/money";
import { buildQrMatrix, qrToSvg } from "@/lib/qr";
import { ticketTokenFor } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function PrintTicketsPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/scanner/login");

  const { reference } = await params;
  const context = await getBookingContext(reference);
  if (!context) notFound();

  const tickets = await listTicketsForReference(reference);
  if (tickets.length === 0) notFound();

  const { booking, event } = context;
  const appUrl = await resolveAppUrl();
  const eventDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: event.timezone,
  }).format(new Date(event.starts_at));

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-xs font-medium uppercase tracking-[0.16em] text-mute transition hover:text-ink"
          >
            ← Operations
          </Link>
          <h1 className="display mt-2 text-2xl leading-none text-ink">Print codes</h1>
          <p className="mt-1 text-sm text-mute">
            {tickets.length} {tickets.length === 1 ? "code" : "codes"} · ref{" "}
            <span className="font-mono text-xs text-ink">{booking.reference}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/gate" className="btn-ghost">
            New sale
          </Link>
          <PrintButton label="Print codes" />
        </div>
      </div>

      <div className="print-sheet space-y-5">
        {tickets.map((ticket) => {
          const ticketUrl = `${appUrl}/t/${ticketTokenFor(ticket.id)}`;
          const qrSvg = qrToSvg(buildQrMatrix(ticketUrl), { scale: 7, margin: 4 });

          return (
            <article
              key={ticket.id}
              className="print-ticket overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <div className="flex gap-6 p-6">
                <div
                  className="qr-frame shrink-0 rounded-xl bg-white p-2"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-hot">
                    Shots &amp; Secrets · Admission
                  </p>
                  <h2 className="display mt-1 text-2xl leading-none text-ink">{event.name}</h2>
                  <p className="mt-2 text-sm text-mute">{eventDate}</p>
                  <p className="text-sm text-mute">{event.venue}</p>

                  <p className="mt-4 text-base font-semibold text-ink">{ticket.attendee_label}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <dt className="text-[9px] uppercase tracking-[0.14em] text-mute">Reference</dt>
                      <dd className="font-mono text-ink">{booking.reference}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] uppercase tracking-[0.14em] text-mute">Admits</dt>
                      <dd className="text-ink">{ticket.admits} guest</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] uppercase tracking-[0.14em] text-mute">Paid</dt>
                      <dd className="text-ink">
                        {formatMoney(booking.amount_minor, booking.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[9px] uppercase tracking-[0.14em] text-mute">Code</dt>
                      <dd className="break-all font-mono text-[10px] text-ink">
                        {ticketTokenFor(ticket.id)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[10px] text-mute/70">
                    Single use · scan at the entrance · {session.label}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
