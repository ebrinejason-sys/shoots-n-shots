"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        mustChangePassword?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Could not sign in");
        setBusy(false);
        return;
      }

      router.push(data.mustChangePassword ? "/admin/set-password" : "/admin");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <label className="block text-sm">
        <span className="text-[11px] uppercase tracking-[0.16em] text-mute">Email</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          autoComplete="username"
          className="input mt-2"
        />
      </label>

      <label className="block text-sm">
        <span className="text-[11px] uppercase tracking-[0.16em] text-mute">Password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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

      <button type="submit" disabled={busy || !email || !password} className="btn-primary w-full">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
