import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminToken, STAFF_COOKIE, staffCookieOptions } from "@/lib/auth";
import { resolveAdminSession } from "@/lib/guards";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { setPassword } from "@/lib/users";

const PasswordSchema = z.object({
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH),
});

export async function POST(request: Request) {
  const admin = await resolveAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Admin sign-in required" }, { status: 401 });
  }

  if (!rateLimit(`admin-password:${admin.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts, try again shortly" }, { status: 429 });
  }

  const parsed = PasswordSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Choose a new password" },
      { status: 400 },
    );
  }

  try {
    if (await verifyPassword(parsed.data.password, admin.user.password_hash)) {
      return NextResponse.json(
        { error: "Choose a password you have not used here before" },
        { status: 400 },
      );
    }

    await setPassword(admin.user.id, await hashPassword(parsed.data.password));

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      STAFF_COOKIE,
      createAdminToken({
        userId: admin.user.id,
        version: admin.user.session_version,
        label: admin.user.name,
      }),
      staffCookieOptions,
    );
    return response;
  } catch (error) {
    console.error("password change failed", error);
    return NextResponse.json({ error: "Could not save the password" }, { status: 500 });
  }
}
