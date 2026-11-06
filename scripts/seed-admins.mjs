// Creates the first admin accounts. Safe to run repeatedly: an account that
// already exists is left alone, so a password somebody has changed stays set.
//
//   npm run db:admins                  create the three accounts below
//   npm run db:admins -- --reset EMAIL  issue a fresh temporary password
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { generateTemporaryPassword, hashPassword } from "./lib/scrypt-hash.mjs";

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
    // .env is optional; fall back to the local default below.
  }
}

loadEnv();

const SEEDED = [
  { email: "cholmosesayiel@gmail.com", name: "Moses Ayiel", password: "test1234" },
  { email: "jeanjacquesmartino08@gmail.com", name: "Jean Jacques Martino", password: "test1234" },
  { email: "ebrinetushabe@gmail.com", name: "Ebrine Tushabe", password: "test1234" },
];

const connectionString =
  process.env.DATABASE_URL ?? "postgres://sns:sns_dev_password@localhost:5432/sns_tickets";

// Must match src/lib/db-config.ts: hosted Postgres needs TLS, local Docker does not.
function sslFor(url) {
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1", ""].includes(parsed.hostname);
  const mode = parsed.searchParams.get("sslmode");
  if (mode === "disable") return undefined;
  if (mode === "require" || (process.env.DATABASE_SSL ?? "").toLowerCase() === "true" || !local) {
    return process.env.DATABASE_SSL_CA
      ? { ca: process.env.DATABASE_SSL_CA, rejectUnauthorized: true }
      : { rejectUnauthorized: false };
  }
  return undefined;
}

async function seed(client) {
  let created = 0;
  for (const admin of SEEDED) {
    const { rows } = await client.query(
      `INSERT INTO admin_users (email, name, password_hash, must_change_password)
       VALUES (lower($1), $2, $3, true)
       ON CONFLICT DO NOTHING
       RETURNING email`,
      [admin.email, admin.name, await hashPassword(admin.password)],
    );
    if (rows.length > 0) {
      created += 1;
      console.log(`  created ${admin.email} (temporary password: ${admin.password})`);
    } else {
      console.log(`  left ${admin.email} alone — already exists`);
    }
  }
  console.log(`${created} new admin account(s).`);
}

async function reset(client, email) {
  const temporaryPassword = generateTemporaryPassword();
  const { rows } = await client.query(
    `UPDATE admin_users
        SET password_hash = $2,
            must_change_password = true,
            password_changed_at = NULL,
            session_version = session_version + 1
      WHERE lower(email) = lower($1)
      RETURNING email, name`,
    [email, await hashPassword(temporaryPassword)],
  );

  if (rows.length === 0) {
    console.error(`No admin account for ${email}.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Reset ${rows[0].email} (${rows[0].name}).`);
  console.log(`Temporary password: ${temporaryPassword}`);
  console.log("They must choose a new one on their next sign-in.");
}

const client = new pg.Client({ connectionString, ssl: sslFor(connectionString) });
const resetFlag = process.argv.indexOf("--reset");

try {
  await client.connect();
  console.log(`database: ${new URL(connectionString).hostname}`);

  if (resetFlag !== -1) {
    const email = process.argv[resetFlag + 1];
    if (!email) {
      console.error("Usage: npm run db:admins -- --reset EMAIL");
      process.exitCode = 1;
    } else {
      await reset(client, email);
    }
  } else {
    await seed(client);
    console.log("Invites are sent from /admin/team once deployed.");
  }
} catch (error) {
  if (error.code === "42P01") {
    console.error("admin_users does not exist yet — run `npm run db:setup` first.");
  } else {
    console.error("seeding admins failed:", error.message);
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
