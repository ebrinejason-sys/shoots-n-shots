import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminToken, STAFF_COOKIE, staffCookieOptions } from "@/lib/auth";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/password";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { findAdminByEmail, recordLogin } from "@/lib/users";

const LoginSchema = z.object({
  email: z.string().trim().min(3, "Enter your email").max(254),
  password: z.string().min(1, "Enter your password").max(200),
});

export async function POST(request: Request) {
  if (!rateLimit(`admin-login:${clientKey(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts, try again shortly" }, { status: 429 });
  }

  const parsed = LoginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Email and password required" },
      { status: 400 },
    );
  }

  try {
    const user = await findAdminByEmail(parsed.data.email);
    // Always run a real verify so an unknown address costs the same as a wrong password.
    const passwordOk = await verifyPassword(
      parsed.data.password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordOk || !user.is_active) {
      return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
    }

    await recordLogin(user.id);

    const response = NextResponse.json({
      ok: true,
      name: user.name,
      mustChangePassword: user.must_change_password,
    });
    response.cookies.set(
      STAFF_COOKIE,
      createAdminToken({
        userId: user.id,
        version: user.session_version,
        label: user.name,
      }),
      staffCookieOptions,
    );
    return response;
  } catch (error) {
    console.error("admin sign-in failed", error);
    return NextResponse.json({ error: "Could not sign in right now" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_COOKIE, "", { ...staffCookieOptions, maxAge: 0 });
  return response;
}
