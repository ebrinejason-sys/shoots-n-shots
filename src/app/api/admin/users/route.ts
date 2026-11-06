import { NextResponse } from "next/server";
import { z } from "zod";
import { EMAIL_PATTERN } from "@/lib/booking";
import { requireAdmin } from "@/lib/guards";
import { sendInvite } from "@/lib/invite";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { insertAdmin, listAdmins, normalizeEmail } from "@/lib/users";

export const dynamic = "force-dynamic";

const NewAdminSchema = z.object({
  email: z.string().trim().max(200).regex(EMAIL_PATTERN, "Enter a valid email address"),
  name: z.string().trim().min(1, "Enter their name").max(80),
});

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (!rateLimit(`team-read:${clientKey(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return NextResponse.json({ users: await listAdmins() });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (!rateLimit(`team-write:${clientKey(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many changes, slow down" }, { status: 429 });
  }

  const parsed = NewAdminSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the details" },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const temporaryPassword = generateTemporaryPassword();

  try {
    const user = await insertAdmin({
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(temporaryPassword),
    });

    if (!user) {
      return NextResponse.json(
        { error: "That email already has an admin account" },
        { status: 409 },
      );
    }

    const delivery = await sendInvite({ name: user.name, email: user.email, temporaryPassword });
    return NextResponse.json(
      {
        user,
        temporaryPassword,
        emailSent: delivery.ok,
        emailDetail: delivery.detail,
        appUrl: delivery.appUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("admin create failed", error);
    return NextResponse.json({ error: "Could not add that admin" }, { status: 500 });
  }
}
