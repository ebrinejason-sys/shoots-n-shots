// End-to-end smoke test. Needs `npm run dev` running and a seeded database.
// Usage: npm run smoke   (optionally SMOKE_BASE_URL=http://localhost:3000)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const text = readFileSync(join(here, "..", ".env"), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match || line.trim().startsWith("#")) continue;
      const [, key, raw] = match;
      if (process.env[key] === undefined) {
        process.env[key] = raw.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env is optional; defaults below match docker-compose.yml
  }
}

loadEnv();

const BASE_URL = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://sns:sns_dev_password@localhost:5432/sns_tickets";
const PASSCODE = process.env.STAFF_PASSCODE ?? "staff1234";
const SLUG = process.env.SMOKE_EVENT_SLUG ?? "ss-night-live";

let passed = 0;

function check(label, condition, detail) {
  if (!condition) {
    console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    process.exitCode = 1;
    throw new Error(label);
  }
  passed += 1;
  console.log(`ok    ${label}`);
}

async function post(path, body, headers = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function staffCookieFrom(response) {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
  const staff = cookies.find((cookie) => cookie.startsWith("sns_staff="));
  if (!staff) throw new Error("staff login did not set a cookie");
  return staff.split(";")[0];
}

async function book(quantity) {
  const { response, data } = await post("/api/bookings", {
    slug: SLUG,
    customerName: "Smoke Tester",
    phone: "+256700000001",
    email: "smoke@example.com",
    quantity,
  });
  check(`book ${quantity} ticket(s) → 201`, response.status === 201, JSON.stringify(data));
  return data;
}

function tokenFromUrl(url) {
  return new URL(url, BASE_URL).pathname.split("/").filter(Boolean).at(-1);
}

const db = new pg.Client({ connectionString: DATABASE_URL });

try {
  await db.connect();

  const login = await post("/api/auth/staff", { passcode: PASSCODE, label: "Smoke test" });
  check("staff login", login.response.status === 200, JSON.stringify(login.data));
  const cookie = staffCookieFrom(login.response);

  // --- Happy path -----------------------------------------------------------
  const booking = await book(2);
  check("booking holds a reference", /^SNS-[A-Z2-9]{8}$/.test(booking.reference), booking.reference);

  const confirm = await post("/api/payments/mock-confirm", { reference: booking.reference });
  check("mock payment confirms", confirm.response.status === 200 && confirm.data.status === "paid");
  check("ticket URL returned", typeof confirm.data.ticketUrl === "string");
  const token = tokenFromUrl(confirm.data.ticketUrl);
  check("ticket token has the expected shape", /^[A-Za-z0-9_-]{32}$/.test(token), token);

  const again = await post("/api/payments/mock-confirm", { reference: booking.reference });
  check("replayed confirmation is idempotent", again.response.status === 200 && again.data.ticketUrl === confirm.data.ticketUrl);

  const issued = await db.query(
    `SELECT count(*)::int AS n FROM tickets t
     JOIN bookings b ON b.id = t.booking_id
     WHERE b.reference = $1`,
    [booking.reference],
  );
  check("exactly one ticket issued", issued.rows[0].n === 1, `count=${issued.rows[0].n}`);

  const ticketPage = await fetch(`${BASE_URL}${new URL(confirm.data.ticketUrl).pathname}`);
  check("ticket page renders", ticketPage.status === 200);

  const firstScan = await post("/api/scan", { code: confirm.data.ticketUrl }, { Cookie: cookie });
  check("first scan is VALID", firstScan.data.outcome === "VALID", firstScan.data.outcome);
  check("scan reports the party size", firstScan.data.quantity === 2, String(firstScan.data.quantity));

  const secondScan = await post("/api/scan", { code: token }, { Cookie: cookie });
  check("second scan is ALREADY_USED", secondScan.data.outcome === "ALREADY_USED", secondScan.data.outcome);

  const garbage = await post("/api/scan", { code: "not-a-ticket-code" }, { Cookie: cookie });
  check("garbage scan is INVALID", garbage.data.outcome === "INVALID", garbage.data.outcome);

  const anonymous = await post("/api/scan", { code: token });
  check("anonymous scanning is rejected", anonymous.response.status === 401, String(anonymous.response.status));

  // --- UNPAID: a ticket row can only exist for an unpaid booking if it was
  // issued and the booking later lost its PAID state; simulate that directly.
  const pending = await book(1);
  const unpaidToken = "unpaid-probe-0000000000000000000";
  const pendingId = await db.query(`SELECT id FROM bookings WHERE reference = $1`, [pending.reference]);
  await db.query(`INSERT INTO tickets (booking_id, token_hash) VALUES ($1, $2)`, [
    pendingId.rows[0].id,
    createHash("sha256").update(unpaidToken).digest("hex"),
  ]);
  const unpaidScan = await post("/api/scan", { code: unpaidToken }, { Cookie: cookie });
  check("unpaid ticket scan is UNPAID", unpaidScan.data.outcome === "UNPAID", unpaidScan.data.outcome);

  const refused = await post("/api/payments/mock-confirm", {
    reference: pending.reference,
    outcome: "decline",
  });
  check("declined payment is marked failed", refused.response.status === 200 && refused.data.status === "failed");

  console.log(`\n${passed} checks passed.`);
} catch (error) {
  console.error(`\nSmoke test aborted: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.end();
}
