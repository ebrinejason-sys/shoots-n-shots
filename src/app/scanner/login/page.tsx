import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getStaffSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ScannerLoginPage() {
  const session = await getStaffSession();
  if (session) redirect("/scanner");

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-hot">
          Staff only
        </p>
        <h1 className="display mt-2 text-4xl leading-none text-ink">Gate sign in</h1>
        <p className="mt-3 text-sm text-mute">
          Enter the shared gate passcode to scan tickets.
        </p>
      </div>
      <LoginForm showHint={process.env.NODE_ENV !== "production"} />
    </div>
  );
}
