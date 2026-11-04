// Applies db/schema.sql and seeds a demo event. Safe to run repeatedly.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));

// Minimal .env loader so this script works without extra dependencies.
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
    // .env is optional; fall back to a sensible local default.
  }
}

loadEnv();

const connectionString =
  process.env.DATABASE_URL ?? "postgres://sns:sns_dev_password@localhost:5432/sns_tickets";

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  const schema = readFileSync(join(here, "schema.sql"), "utf8");
  await client.query(schema);
  console.log("schema applied");

  // Rename the original demo event in place so existing bookings keep their event_id.
  await client.query(
    `UPDATE events SET slug = 'shots-and-secrets'
      WHERE slug = 'ss-night-live'
        AND NOT EXISTS (SELECT 1 FROM events WHERE slug = 'shots-and-secrets')`,
  );

  await client.query(
    `INSERT INTO events
       (slug, name, description, venue, starts_at, ends_at, timezone,
        price_minor, currency, capacity, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
     ON CONFLICT (slug) DO UPDATE SET
       name        = EXCLUDED.name,
       description = EXCLUDED.description,
       venue       = EXCLUDED.venue,
       starts_at   = EXCLUDED.starts_at,
       ends_at     = EXCLUDED.ends_at,
       timezone    = EXCLUDED.timezone,
       price_minor = EXCLUDED.price_minor,
       currency    = EXCLUDED.currency,
       capacity    = GREATEST(EXCLUDED.capacity, events.sold),
       is_active   = true`,
    [
      "shots-and-secrets",
      "Shots & Secrets",
      "Come for the shots, stay for the secrets. Drinks on the house, dress code party comfy.",
      "Secret location — shared after payment",
      "2026-11-06T20:00:00+03:00",
      "2026-11-07T02:00:00+03:00",
      "Africa/Kampala",
      10000,
      "UGX",
      150,
    ],
  );
  console.log("seeded demo event: /events/shots-and-secrets");
} catch (error) {
  console.error("database setup failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
