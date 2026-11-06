import Link from "next/link";
import { TeamPanel } from "@/components/TeamPanel";
import { requireAdminPage } from "@/lib/guards";
import { listAdmins } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const admin = await requireAdminPage();
  const users = await listAdmins();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Accounts</p>
          <h1 className="display mt-2 text-4xl leading-none text-ink">Team</h1>
          <p className="mt-2 text-sm text-mute">Signed in as {admin.user.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/set-password" className="btn-ghost">
            Change my password
          </Link>
          <Link href="/admin" className="btn-link">
            ← Operations
          </Link>
        </div>
      </div>

      <TeamPanel initialUsers={users} currentUserId={admin.user.id} />
    </div>
  );
}
