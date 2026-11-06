import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getAdminSession } from "./auth";
import type { AdminSession } from "./auth";
import { findAdminById } from "./users";
import type { AdminUser } from "./users";

export interface VerifiedAdmin {
  session: AdminSession;
  user: AdminUser;
}

/**
 * The cookie proves who signed in; the database decides whether that is still
 * true. `must_change_password` lives here and never in the token, so a reset by
 * another admin takes effect on the target's very next request.
 */
export async function resolveAdminSession(): Promise<VerifiedAdmin | null> {
  const session = await getAdminSession();
  if (!session) return null;

  const user = await findAdminById(session.userId);
  if (!user || !user.is_active) return null;
  if (user.session_version !== session.version) return null;

  return { session, user };
}

type ApiGuard = { ok: true; admin: VerifiedAdmin } | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<ApiGuard> {
  const admin = await resolveAdminSession();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admin sign-in required" }, { status: 401 }),
    };
  }
  if (admin.user.must_change_password) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Choose a new password before continuing", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, admin };
}

export async function requireAdminPage(): Promise<VerifiedAdmin> {
  const admin = await resolveAdminSession();
  if (!admin) redirect("/admin/login");
  if (admin.user.must_change_password) redirect("/admin/set-password");
  return admin;
}
