import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { Scanner } from "@/components/Scanner";
import { getStaffSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const session = await getStaffSession();
  if (!session) redirect("/scanner/login");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-hot">
            Gate check
          </p>
          <h1 className="display mt-1 text-3xl leading-none text-ink">Scan tickets</h1>
          <p className="mt-2 text-sm text-mute">Signed in as {session.label}</p>
        </div>
        <LogoutButton />
      </div>
      <Scanner />
      <p className="mx-auto max-w-lg text-xs leading-relaxed text-mute/70">
        Camera scanning needs a secure context. On localhost it works directly; from a phone on
        your network run <code className="font-mono text-ink">npm run dev:https</code> and open the
        certificate warning once.
      </p>
    </div>
  );
}
