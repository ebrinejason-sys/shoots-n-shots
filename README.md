# Shots & Secrets — Tickets

A working event-ticketing system: booking form → Mobile Money / card payment → automatic QR
ticket emailed to the guest → scanning at the gate → validity check, plus **gate sales** for
walk-ins who pay cash or mobile money at the entrance and get a printed code each.

Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind and Postgres (local Docker or
**Supabase Cloud**). Payments use Flutterwave v3. The prototype runs in **mock-payment mode by
default**, so the whole flow is demoable without any credentials.

## Quick start

Local Postgres in Docker:

```bash
docker compose up -d
```

Or skip Docker and point `DATABASE_URL` at a Supabase Cloud project (see
[Supabase](#supabase-cloud) below), then run the same two commands.

```bash
npm install
```

```bash
npm run db:setup
```

```bash
npm run dev
```

Open <http://localhost:3000>.

### Walk the whole flow

1. **Book** — open the demo event (*Shots & Secrets*, Friday 6 November, 10,000 UGX), enter a
   name, phone, email and quantity. You are taken to the payment page with a booking reference
   like `SNS-K7QM2XPD`.
2. **Pay** — in mock mode press *Approve payment (test)*. This calls the same server-side
   confirmation path a real Flutterwave webhook uses: the booking flips to `PAID`, exactly one
   ticket is issued, and delivery runs.
3. **Ticket** — the success panel opens `/t/<token>`, showing the customer name, booking
   reference, event, quantity, payment status and a QR code.
4. **Scan** — go to `/scanner`, sign in with the development passcode `staff1234`, then either
   start the camera and point it at the QR, or paste the ticket URL into the manual box. Scan once
   to see **VALID**, again to see **ALREADY_USED**.
5. **Operations** — `/admin` lists bookings, revenue and the recent scan log.
6. **Gate sale** — from `/admin` press *Sell at gate*. Enter the walk-in's name and email, choose
   cash or mobile money, and record the sale. Each guest gets their own single-use code; the sheet
   at `/admin/gate/<reference>` prints one QR block per guest, and the same codes are emailed.

## Supabase Cloud

1. Create a project, then open **Project settings → Database → Connection string**.
2. Put the **pooler** string (port `6543`, transaction mode) in `DATABASE_URL`. The app only issues
   unnamed statements and ordinary transactions, so pgbouncer is compatible.
3. Apply the schema with the **direct** string (port `5432`), because DDL through the pooler can
   fail:

```bash
DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" npm run db:setup
```

TLS switches on automatically for any non-local host. `DATABASE_SSL=true` forces it;
`DATABASE_SSL_CA=<pem>` verifies the server certificate instead of accepting it unverified (the
default, because Supabase's pooler CA is not in Node's trust store).

`db:setup` is additive and re-runnable: it adds the gate-sale columns, backfills `admits`, and
re-derives every ticket token hash. Free Supabase projects pause when idle; the first request after
a pause can take a few seconds.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run dev:https` | Same, over HTTPS — needed for camera access from a phone on your LAN |
| `npm run db:setup` | Applies `db/schema.sql` and seeds the demo event (idempotent) |
| `npm run smoke` | End-to-end HTTP check against a running dev server — bookings, scans and a 3-guest gate sale |
| `npm test` | Unit tests (money, references, tokens, QR/PNG, staff sessions) |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |

## Configuration

Copy `.env.example` to `.env` and fill in what you need. Everything has a working default for
local development.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | compose default | Postgres connection string (Supabase pooler on 6543) |
| `DATABASE_SSL` / `DATABASE_SSL_CA` | auto | Force TLS / verify with a CA bundle instead of accepting any certificate |
| `APP_URL` | `http://localhost:3000` | Origin used for ticket links where no request context exists — set it to the public HTTPS origin in production |
| `MOCK_PAYMENTS` | `true` | `false` enables real Flutterwave checkout |
| `FLUTTERWAVE_PUBLIC_KEY` / `FLUTTERWAVE_SECRET_KEY` | — | Flutterwave API credentials |
| `FLUTTERWAVE_WEBHOOK_SECRET` | — | The *secret hash* from the dashboard; arrives as `verif-hash` |
| `STAFF_PASSCODE` | `staff1234` | Shared gate passcode |
| `COOKIE_SECRET` | dev placeholder | Signs the staff session cookie |
| `TICKET_SECRET` | dev placeholder | Derives unguessable ticket tokens |
| `DELIVERY_CHANNELS` | `console,email` | Comma-separated: `console`, `whatsapp`, `sms`, `email` |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME` | — | WhatsApp Cloud API |
| `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` | — | Africa's Talking SMS |
| `RESEND_API_KEY`, `EMAIL_FROM` | — | Resend email |

Change `COOKIE_SECRET` and `TICKET_SECRET` before deploying anywhere real. Rotating
`TICKET_SECRET` invalidates every previously issued ticket link.

## Switching to real payments

1. Put your Flutterwave keys and webhook secret in `.env`.
2. Set `MOCK_PAYMENTS=false` and `APP_URL` to a public HTTPS origin.
3. In the Flutterwave dashboard, set the webhook URL to `https://<your-host>/api/webhooks/flutterwave`.
4. Restart the server.

The webhook accepts `charge.completed`, compares `verif-hash` in constant time, then **re-verifies
the transaction with Flutterwave's API** and re-checks the amount, currency and reference before
fulfilling. A failed or cancelled charge releases the held booking. The browser redirect
(`/api/payments/verify?reference=…&transaction_id=…`) is verified the same way and never trusts its
query string on its own; the payment page polls it for 30 seconds after the redirect (the webhook
often lands a moment later) and offers a *Check again* button.

The checkout request carries `meta.reference`, so a payment can be traced in the Flutterwave
dashboard even if the customer closes the browser before coming back. UGX is zero-decimal —
amounts are converted from the stored minor units exactly once, server-side.

## How the important parts work

- **Money** is stored in integer minor units. A currency-exponent table handles zero-decimal
  currencies (UGX, TZS, RWF) and two-decimal ones (NGN, KES, GHS, USD, …). Prices are computed
  server-side; the client never sends an amount.
- **Capacity** is reserved atomically:
  `UPDATE events SET sold = sold + $q WHERE sold + $q <= capacity RETURNING id`. Expired pending
  bookings are released opportunistically on the next booking or scan; there is no cron.
- **Confirmation is idempotent** via a conditional state transition (`PENDING → PAID`). The ticket
  insert and delivery enqueue are unique per booking, so a replayed webhook cannot issue a second
  ticket. Payment confirmation is guarded on status, never on timestamps.
- **Tickets vs attendees**: an online booking issues one ticket whose `admits` equals the quantity,
  so a party of four shares one code. A gate sale issues one ticket per guest with `admits = 1`, so
  each person carries (and can print or receive) their own single-use code.
- **Tokens**: the ticket token is `HMAC-SHA256(TICKET_SECRET, "ticket:" + ticketId)`, truncated to
  32 base64url characters. Only its SHA-256 hash is stored, so the database never holds a usable
  ticket link, yet the URL can be rebuilt at any time for redelivery.
- **Scanning** is a single conditional update:
  `UPDATE tickets SET status='USED' … WHERE status='VALID' RETURNING *`. Zero rows means it was
  already used. Every outcome — valid, already used, unpaid, invalid — is written to `scan_logs`.
- **QR payloads use the request's own origin**, not a hard-coded host: a ticket opened on
  `http://192.168.1.186:3000` encodes that same LAN address, so the phone that scans it can reach
  the page. Set `APP_URL` in production so emailed codes point at the public origin.
- **Viewing a ticket never consumes it.** `/t/<token>` is read-only on GET (link previews and
  re-opens are safe); marking it used requires a staff-authenticated POST to `/api/scan`.
- **Delivery never rolls back a payment.** It runs after the payment transaction commits, and each
  channel's result lands in `delivery_outbox`.

## Scanning from a phone

`/scanner` uses the browser's `BarcodeDetector` where it exists (Android Chrome and other Chromium
browsers) and falls back to decoding frames with **jsQR** everywhere else — iOS Safari included — so
the in-app camera works on iPhones too. The manual-entry box always works as a backup.

Cameras require a secure context. `localhost` counts as secure; from another device use
`npm run dev:https` and accept the development certificate once, then open
`https://<your-ip>:3000/scanner`. Over plain HTTP on a LAN address the camera stays blocked, but the
phone's own camera app can still open the ticket link.

## Security notes (prototype scope)

- Staff sign-in is a **single shared passcode** with an HMAC-signed, `httpOnly`, `sameSite=lax`
  cookie valid for 12 hours. There are no individual accounts, roles or audit identities beyond
  the label each person types.
- Rate limits are **in-memory and per-process** — adequate for one dev server, not a clustered
  deployment.
- Only two routes mark a booking paid: the Flutterwave webhook (which always re-verifies with the
  provider API first) and `/api/gate-sales` (staff session required, rate-limited, amount computed
  server-side).
- Ticket pages send `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex` so tokens do not
  leak through shared links or search indexes.

## Dependency notes

`npm audit` currently reports advisories in PostCSS as bundled inside Next (build-time CSS
processing only) and in Vitest's worker pool (development dependency, never shipped). The offered
fixes are major-version upgrades (Next 16 / Vitest 5), which are outside this prototype's scope.
No advisory affects a runtime dependency this app ships.

## Known limitations

- Online bookings still share one QR across the party. Gate sales issue one code per guest; doing
  the same online would mean asking every guest's name at checkout.
- Gate sales assume a single active event and record the price at sale time; there is no per-event
  gate price.
- No refunds, voids or transfers, and no resale protection.
- A payment that arrives **after** the 20-minute hold has expired is not fulfilled automatically:
  the hold is already cancelled and its capacity released, so the payment has to be reconciled
  manually. A production build should extend the hold or refund late payments.
- No offline scanning — the gate needs connectivity.
- WhatsApp business-initiated messages require an approved template or an open 24-hour window, so
  the success page also offers a `wa.me` link. `DELIVERY_CHANNELS=console` is the default.
- No deployment configuration, secret manager or per-user staff accounts.
