import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { resolveAdminSession } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await resolveAdminSession();
  if (admin) redirect(admin.user.must_change_password ? "/admin/set-password" : "/admin");

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-6">
      <div>
        <p className="eyebrow text-hot">Admin</p>
        <h1 className="display mt-2 text-4xl leading-none text-ink">Sign in</h1>
        <p className="mt-3 text-sm text-mute">
          Use the email and password for your admin account.
        </p>
      </div>

      <AdminLoginForm />

      <p className="text-center text-xs text-mute">
        Scanning tickets at the door?{" "}
        <Link href="/scanner/login" className="btn-link">
          Use the gate passcode
        </Link>
      </p>
    </div>
  );
}
