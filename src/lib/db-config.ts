import type { PoolConfig } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);

/**
 * Supabase (and most hosted Postgres) requires TLS, while the local Docker
 * database does not. The pooler certificate is not in Node's trust store, so
 * verification is relaxed unless a CA is supplied explicitly.
 */
export function databaseConfig(): PoolConfig {
  const connectionString =
    process.env.DATABASE_URL ?? "postgres://sns:sns_dev_password@localhost:5432/sns_tickets";

  let host = "";
  let sslMode: string | null = null;
  try {
    const url = new URL(connectionString);
    host = url.hostname;
    sslMode = url.searchParams.get("sslmode");
  } catch {
    // Leave host empty so the local defaults apply.
  }

  const sslDisabled = sslMode === "disable";
  const sslRequested =
    sslMode === "require" ||
    (process.env.DATABASE_SSL ?? "").toLowerCase() === "true" ||
    !LOCAL_HOSTS.has(host);

  const ca = process.env.DATABASE_SSL_CA;

  return {
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    ...(sslRequested && !sslDisabled
      ? { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false } }
      : {}),
  };
}
