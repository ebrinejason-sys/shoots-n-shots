import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { sendInvite } from "@/lib/invite";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { findAdminById, rotateTemporaryPassword } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (!rateLimit(`team-invite:${clientKey(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many invites, slow down" }, { status: 429 });
  }

  const { id } = await params;
  if (id === guard.admin.user.id) {
    return NextResponse.json(
      { error: "This would sign you out. Ask another admin to reset yours." },
      { status: 400 },
    );
  }

  const existing = await findAdminById(id);
  if (!existing) {
    return NextResponse.json({ error: "No such admin" }, { status: 404 });
  }

  try {
    const temporaryPassword = generateTemporaryPassword();
    const user = await rotateTemporaryPassword(id, await hashPassword(temporaryPassword));
    if (!user) {
      return NextResponse.json({ error: "No such admin" }, { status: 404 });
    }

    const delivery = await sendInvite({
      name: user.name,
      email: user.email,
      temporaryPassword,
    });

    return NextResponse.json({
      user,
      temporaryPassword,
      emailSent: delivery.ok,
      emailDetail: delivery.detail,
      appUrl: delivery.appUrl,
    });
  } catch (error) {
    console.error("admin invite failed", error);
    return NextResponse.json({ error: "Could not send the invite" }, { status: 500 });
  }
}
