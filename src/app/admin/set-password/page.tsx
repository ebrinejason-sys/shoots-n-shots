import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { resolveAdminSession } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const admin = await resolveAdminSession();
  if (!admin) redirect("/admin/login");

  const pending = admin.user.must_change_password;

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-6">
      <div>
        <p className="eyebrow text-hot">{pending ? "First sign-in" : "Account"}</p>
        <h1 className="display mt-2 text-4xl leading-none text-ink">
          {pending ? "Choose a password" : "Change password"}
        </h1>
        <p className="mt-3 text-sm text-mute">
          {pending
            ? "Your temporary password stops working as soon as you save this one."
            : `Signed in as ${admin.user.email}.`}
        </p>
      </div>

      <SetPasswordForm pending={pending} />
    </div>
  );
}
