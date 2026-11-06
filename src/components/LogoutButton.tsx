"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/staff", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="rounded-xl border border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mute transition hover:border-hot/60 hover:text-hot"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
