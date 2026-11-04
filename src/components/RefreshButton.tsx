"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-xl border border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mute transition hover:border-accent/60 hover:text-ink disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
