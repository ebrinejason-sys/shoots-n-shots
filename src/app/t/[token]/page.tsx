import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";
import { MarkUsedButton } from "@/components/MarkUsedButton";
import { Steps } from "@/components/Steps";
import { resolveAppUrl } from "@/lib/app-url";
import { getStaffSession } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { buildQrMatrix, qrToSvg } from "@/lib/qr";
import { getTicketView } from "@/lib/scan";
import { TOKEN_PATTERN } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your ticket",
  robots: { index: false, follow: false },
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) notFound();

  const ticket = await getTicketView(token);
  if (!ticket) notFound();

  const staff = await getStaffSession();
  const appUrl = await resolveAppUrl();
  const ticketUrl = `${appUrl}/t/${token}`;
  const qrSvg = qrToSvg(buildQrMatrix(ticketUrl), { scale: 8, margin: 4 });

  const paid = ticket.bookingStatus === "PAID";
  const state = !paid ? "UNPAID" : ticket.status;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.16em] text-mute transition hover:text-ink"
        >
          ← Shots &amp; Secrets
        </Link>
        <StateBadge state={state} />
      </div>

      <div className="flex justify-center pb-1">
        <Steps current={3} />
      </div>

      <article className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="relative overflow-hidden px-6 py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-24 h-56 w-56 rounded-full bg-accent/30 blur-3xl"
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-hot">
              Admit {ticket.admits > 1 ? `${ticket.admits} people` : "one"}
            </p>
            <h1 className="display mt-2 text-3xl leading-none text-ink">{ticket.eventName}</h1>
            <p className="mt-2 text-sm text-mute">{ticket.eventVenue}</p>
            {ticket.attendeeLabel ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-accent">
                {ticket.attendeeLabel}
              </p>
            ) : null}
            <p className="text-sm text-mute">
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: ticket.eventTimezone,
              }).format(new Date(ticket.eventStartsAt))}
            </p>
          </div>
        </div>

        <div className="hairline h-px w-full opacity-50" />
        <div className="ticket-edge mx-6 -mt-px border-b border-dashed border-line" />

        <div className="flex flex-col items-center gap-5 px-6 py-6">
          <div
            className="qr-frame w-56 rounded-xl bg-white p-3"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="text-center text-xs text-mute/70">
            Show this code at the entrance. One scan admits{" "}
            {ticket.admits === 1 ? "one guest" : `all ${ticket.admits} guests`}.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 border-t border-line px-6 py-5 text-sm">
          <Field label="Name" value={ticket.customerName} />
          <Field
            label="Reference"
            value={<span className="font-mono text-xs">{ticket.reference}</span>}
          />
          <Field label="Admits" value={String(ticket.admits)} />
          <Field
            label="Paid"
            value={
              <span className={paid ? "text-accent" : "text-hot"}>
                {formatMoney(ticket.amountMinor, ticket.currency)}
              </span>
            }
          />
        </dl>
      </article>

      <div className="flex gap-2">
        <CopyLink url={ticketUrl} />
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `My ticket for ${ticket.eventName} — ${ticketUrl}`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost flex-1 text-center"
        >
          Share
        </a>
      </div>

      {state === "USED" && ticket.usedAt ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mute">
          <span className="font-medium text-ink">Already used.</span> Scanned at{" "}
          {new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: ticket.eventTimezone,
          }).format(new Date(ticket.usedAt))}
          .
        </p>
      ) : null}

      {state === "UNPAID" ? (
        <p className="rounded-xl border border-hot/40 bg-hot-soft px-4 py-3 text-sm text-ink">
          Payment has not been confirmed for this booking. The ticket is not valid for entry.
        </p>
      ) : null}

      {staff ? (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs text-mute">
            Signed in as <span className="font-medium text-ink">{staff.label}</span>
          </p>
          <MarkUsedButton token={token} disabled={state !== "VALID"} />
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.16em] text-mute">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
    </div>
  );
}

function StateBadge({ state }: { state: "VALID" | "USED" | "VOID" | "UNPAID" }) {
  const styles: Record<string, string> = {
    VALID: "border-accent/50 bg-accent-soft text-accent",
    USED: "border-line bg-surface text-mute",
    VOID: "border-hot/50 bg-hot-soft text-hot",
    UNPAID: "border-hot/50 bg-hot-soft text-hot",
  };
  const labels: Record<string, string> = {
    VALID: "Valid",
    USED: "Already used",
    VOID: "Void",
    UNPAID: "Unpaid",
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${styles[state]}`}
    >
      {labels[state]}
    </span>
  );
}
