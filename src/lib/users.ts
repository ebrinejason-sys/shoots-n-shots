import { query } from "./db";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  must_change_password: boolean;
  is_active: boolean;
  session_version: number;
  created_at: string;
  last_login_at: string | null;
  password_changed_at: string | null;
}

/** Safe to hand to a page or an API response. */
export type AdminSummary = Omit<AdminUser, "password_hash">;

const SUMMARY_COLUMNS = `id, email, name, must_change_password, is_active, session_version,
  created_at, last_login_at, password_changed_at`;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const { rows } = await query<AdminUser>(
    `SELECT id, email, name, password_hash, must_change_password, is_active,
            session_version, created_at, last_login_at, password_changed_at
       FROM admin_users
      WHERE lower(email) = lower($1)
      LIMIT 1`,
    [normalizeEmail(email)],
  );
  return rows[0] ?? null;
}

export async function findAdminById(id: string): Promise<AdminUser | null> {
  const { rows } = await query<AdminUser>(
    `SELECT id, email, name, password_hash, must_change_password, is_active,
            session_version, created_at, last_login_at, password_changed_at
       FROM admin_users
      WHERE id = $1
      LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listAdmins(): Promise<AdminSummary[]> {
  const { rows } = await query<AdminSummary>(
    `SELECT ${SUMMARY_COLUMNS} FROM admin_users ORDER BY created_at ASC, email ASC`,
  );
  return rows;
}

/** Returns null when that email already has an account. */
export async function insertAdmin(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<AdminSummary | null> {
  const { rows } = await query<AdminSummary>(
    `INSERT INTO admin_users (email, name, password_hash, must_change_password)
     VALUES ($1, $2, $3, true)
     ON CONFLICT DO NOTHING
     RETURNING ${SUMMARY_COLUMNS}`,
    [normalizeEmail(input.email), input.name.trim(), input.passwordHash],
  );
  return rows[0] ?? null;
}

export async function recordLogin(id: string): Promise<void> {
  await query(`UPDATE admin_users SET last_login_at = now() WHERE id = $1`, [id]);
}

/** The admin has chosen their own password — the temporary one stops working. */
export async function setPassword(id: string, passwordHash: string): Promise<void> {
  await query(
    `UPDATE admin_users
        SET password_hash = $2,
            must_change_password = false,
            password_changed_at = now()
      WHERE id = $1`,
    [id, passwordHash],
  );
}

/**
 * Issues a fresh temporary password and invalidates the target's existing
 * sessions. Returns null if the account no longer exists.
 */
export async function rotateTemporaryPassword(
  id: string,
  passwordHash: string,
): Promise<AdminSummary | null> {
  const { rows } = await query<AdminSummary>(
    `UPDATE admin_users
        SET password_hash = $2,
            must_change_password = true,
            password_changed_at = NULL,
            session_version = session_version + 1
      WHERE id = $1
      RETURNING ${SUMMARY_COLUMNS}`,
    [id, passwordHash],
  );
  return rows[0] ?? null;
}
