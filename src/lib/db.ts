import pg from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { databaseConfig } from "./db-config";

// Postgres returns int8 as a string to avoid precision loss. Our amounts and
// counts are far below Number.MAX_SAFE_INTEGER, so numbers are safe here.
pg.types.setTypeParser(20, (value) => Number(value));

const globalForPool = globalThis as unknown as { __snsPool?: pg.Pool };

export const pool = globalForPool.__snsPool ?? new pg.Pool(databaseConfig());

if (process.env.NODE_ENV !== "production") {
  globalForPool.__snsPool = pool;
}

export function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
