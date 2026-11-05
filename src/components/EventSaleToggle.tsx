"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventSaleToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Could not change it");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={toggle}
        disabled={busy}
        className={`rounded-sm border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition disabled:opacity-50 ${
          isActive
            ? "border-accent/50 bg-accent-soft text-accent hover:border-accent"
            : "border-line text-mute hover:border-ink hover:text-ink"
        }`}
      >
        {busy ? "…" : isActive ? "On sale" : "Off sale"}
      </button>
      {error ? <p className="mt-1 text-[10px] text-hot">{error}</p> : null}
    </div>
  );
}
