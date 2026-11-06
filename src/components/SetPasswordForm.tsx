"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export function SetPasswordForm({ pending }: { pending: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (tooShort || mismatch) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Could not save the password");
        setBusy(false);
        return;
      }

      router.push("/admin");
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
          {pending ? "New password" : "Password"}
        </span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          autoComplete="new-password"
          className="input mt-2"
        />
      </label>

      <label className="block text-sm">
        <span className="text-[11px] uppercase tracking-[0.16em] text-mute">Confirm</span>
        <input
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          type="password"
          required
          autoComplete="new-password"
          className="input mt-2"
        />
      </label>

      {tooShort && password.length > 0 ? (
        <p className="text-xs text-mute">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
      ) : null}
      {mismatch ? <p className="text-xs text-hot">The two passwords do not match.</p> : null}
      {error ? (
        <p className="rounded-xl border border-hot/40 bg-hot-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || tooShort || mismatch || confirm.length === 0}
        className="btn-primary w-full"
      >
        {busy ? "Saving…" : pending ? "Save and continue" : "Save password"}
      </button>
    </form>
  );
}
