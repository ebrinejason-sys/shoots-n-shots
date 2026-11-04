# Shots & Secrets — Tickets

A working event-ticketing prototype: booking form → Mobile Money / card payment → automatic QR
ticket → WhatsApp/SMS/email delivery → scanning at the gate → validity check.

Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind and Postgres. Payments use
Flutterwave v3. The prototype runs in **mock-payment mode by default**, so the whole flow is
demoable without any credentials.

## Quick start

```bash
docker compose up -d
```

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

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run dev:https` | Same, over HTTPS — needed for camera access from a phone on your LAN |
| `npm run db:setup` | Applies `db/schema.sql` and seeds the demo event (idempotent) |
| `npm run smoke` | End-to-end HTTP check against a running dev server (17 assertions) |
| `npm test` | Unit tests (money, references, tokens, QR/PNG, staff sessions) |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |

## Configuration

Copy `.env.example` to `.env` and fill in what you need. Everything has a working default for
local development.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | compose default | Postgres connection string |
| `APP_URL` | `http://localhost:3000` | Used to build ticket and QR URLs — set it to the public origin in production |
| `MOCK_PAYMENTS` | `true` | `false` enables real Flutterwave checkout |
| `FLUTTERWAVE_PUBLIC_KEY` / `FLUTTERWAVE_SECRET_KEY` | — | Flutterwave API credentials |
| `FLUTTERWAVE_WEBHOOK_SECRET` | — | The *secret hash* from the dashboard; arrives as `verif-hash` |
| `STAFF_PASSCODE` | `staff1234` | Shared gate passcode |
| `COOKIE_SECRET` | dev placeholder | Signs the staff session cookie |
| `TICKET_SECRET` | dev placeholder | Derives unguessable ticket tokens |
| `DELIVERY_CHANNELS` | `console` | Comma-separated: `console`, `whatsapp`, `sms`, `email` |
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
fulfilling. The browser redirect (`/api/payments/verify?reference=…&transaction_id=…`) is verified
the same way and never trusts its query string on its own.

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
- **Tokens**: the ticket token is `HMAC-SHA256(TICKET_SECRET, "ticket:" + bookingId)`, truncated to
  32 base64url characters. Only its SHA-256 hash is stored, so the database never holds a usable
  ticket link, yet the URL can be rebuilt at any time for redelivery.
- **Scanning** is a single conditional update:
  `UPDATE tickets SET status='USED' … WHERE status='VALID' RETURNING *`. Zero rows means it was
  already used. Every outcome — valid, already used, unpaid, invalid — is written to `scan_logs`.
- **Viewing a ticket never consumes it.** `/t/<token>` is read-only on GET (link previews and
  re-opens are safe); marking it used requires a staff-authenticated POST to `/api/scan`.
- **Delivery never rolls back a payment.** It runs after the payment transaction commits, and each
  channel's result lands in `delivery_outbox`.

## Scanning from a phone

`BarcodeDetector` works in Android Chrome and other Chromium browsers. iOS Safari does not expose
it, so there the phone's own camera app opens the ticket page, and staff can press *Mark as used*
on it after signing in. The manual-entry box on `/scanner` always works.

Cameras require a secure context. `localhost` counts as secure; from another device use
`npm run dev:https` and accept the development certificate once, then open
`https://<your-ip>:3000/scanner`.

## Security notes (prototype scope)

- Staff sign-in is a **single shared passcode** with an HMAC-signed, `httpOnly`, `sameSite=lax`
  cookie valid for 12 hours. There are no individual accounts, roles or audit identities beyond
  the label each person types.
- Rate limits are **in-memory and per-process** — adequate for one dev server, not a clustered
  deployment.
- The webhook is the only route that can mark a booking paid, and it always re-verifies with the
  provider API before doing so.
- Ticket pages send `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex` so tokens do not
  leak through shared links or search indexes.

## Dependency notes

`npm audit` currently reports advisories in PostCSS as bundled inside Next (build-time CSS
processing only) and in Vitest's worker pool (development dependency, never shipped). The offered
fixes are major-version upgrades (Next 16 / Vitest 5), which are outside this prototype's scope.
No advisory affects a runtime dependency this app ships.

## Known limitations

- One QR per booking, admitting the whole party (quantity 1–10). Per-attendee QR codes would need
  an `attendees` table.
- No refunds, voids or transfers, and no resale protection.
- A payment that arrives **after** the 20-minute hold has expired is not fulfilled automatically:
  the hold is already cancelled and its capacity released, so the payment has to be reconciled
  manually. A production build should extend the hold or refund late payments.
- No offline scanning — the gate needs connectivity.
- WhatsApp business-initiated messages require an approved template or an open 24-hour window, so
  the success page also offers a `wa.me` link. `DELIVERY_CHANNELS=console` is the default.
- No deployment configuration, secret manager or per-user staff accounts.
