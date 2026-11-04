"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ showHint = false }: { showHint?: boolean }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, label }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Could not sign in");
        setBusy(false);
        return;
      }
      router.push("/scanner");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <label className="block text-sm">
        <span className="text-[11px] uppercase tracking-[0.16em] text-mute">
          Your name (shown in the scan log)
        </span>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={60}
          placeholder="Gate 2 — Sarah"
          className="input mt-2"
        />
      </label>

      <label className="block text-sm">
        <span className="text-[11px] uppercase tracking-[0.16em] text-mute">Passcode</span>
        <input
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          type="password"
          required
          autoComplete="current-password"
          className="input mt-2"
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-hot/40 bg-hot-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy || !passcode} className="btn-primary w-full">
        {busy ? "Signing in…" : "Sign in"}
      </button>

      {showHint ? (
        <p className="text-xs text-mute/70">
          Development passcode: <code className="font-mono text-mute">staff1234</code> (set{" "}
          <code className="font-mono text-mute">STAFF_PASSCODE</code> to change it).
        </p>
      ) : null}
    </form>
  );
}
