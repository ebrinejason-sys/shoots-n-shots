"use client";

import { useState } from "react";
import type { AdminSummary } from "@/lib/users";

interface Notice {
  email: string;
  temporaryPassword: string;
  emailSent: boolean;
  emailDetail: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function TeamPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminSummary[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  async function addAdmin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = (await response.json()) as {
        user?: AdminSummary;
        temporaryPassword?: string;
        emailSent?: boolean;
        emailDetail?: string;
        error?: string;
      };

      if (!response.ok || !data.user || !data.temporaryPassword) {
        setError(data.error ?? "Could not add that admin");
        setBusy(false);
        return;
      }

      setUsers((current) => [...current, data.user as AdminSummary]);
      setNotice({
        email: data.user.email,
        temporaryPassword: data.temporaryPassword,
        emailSent: Boolean(data.emailSent),
        emailDetail: data.emailDetail ?? "",
      });
      setEmail("");
      setName("");
      setBusy(false);
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  async function invite(user: AdminSummary) {
    setInvitingId(user.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/invite`, { method: "POST" });
      const data = (await response.json()) as {
        user?: AdminSummary;
        temporaryPassword?: string;
        emailSent?: boolean;
        emailDetail?: string;
        error?: string;
      };

      if (!response.ok || !data.user || !data.temporaryPassword) {
        setError(data.error ?? "Could not send the invite");
        setInvitingId(null);
        return;
      }

      setUsers((current) => current.map((row) => (row.id === data.user!.id ? data.user! : row)));
      setNotice({
        email: data.user.email,
        temporaryPassword: data.temporaryPassword,
        emailSent: Boolean(data.emailSent),
        emailDetail: data.emailDetail ?? "",
      });
      setInvitingId(null);
    } catch {
      setError("Network error — please try again");
      setInvitingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {notice ? (
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/50 p-5">
          <p className="text-sm font-medium text-ink">
            {notice.emailSent
              ? `Invite emailed to ${notice.email}`
              : `Email not sent to ${notice.email}`}
          </p>
          {!notice.emailSent ? (
            <p className="mt-1 text-xs text-mute">
              {notice.emailDetail || "Email delivery is not configured."} Send these details yourself:
            </p>
          ) : null}
          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-mute">
            Temporary password
          </p>
          <code className="mt-1 block font-mono text-lg text-ink">{notice.temporaryPassword}</code>
          <p className="mt-2 text-xs text-mute">
            Shown once. It stops working as soon as they choose their own password.
          </p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="btn-link mt-3 text-xs uppercase tracking-[0.14em]"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <form onSubmit={addAdmin} className="rounded-2xl border border-line bg-surface p-5">
        <p className="eyebrow text-ink">Add an admin</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[11px] uppercase tracking-[0.16em] text-mute">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              placeholder="Moses Ayiel"
              className="input mt-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[11px] uppercase tracking-[0.16em] text-mute">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              placeholder="name@example.com"
              className="input mt-2"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-hot/40 bg-hot-soft px-3 py-2 text-sm text-ink">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={busy || !email || !name} className="btn-primary">
            {busy ? "Adding…" : "Add and send invite"}
          </button>
          <p className="text-xs text-mute">
            They get a temporary password and must set their own on first sign-in.
          </p>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-[10px] uppercase tracking-[0.14em] text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
              <th className="px-4 py-3 font-medium text-right">Invite</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">
                      {user.name}
                      {isSelf ? (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-mute">
                          you
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-mute">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        user.must_change_password
                          ? "border-line bg-paper text-mute"
                          : "border-accent/50 bg-accent-soft text-accent"
                      }`}
                    >
                      {user.must_change_password ? "Invited" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-mute">{formatDate(user.last_login_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {isSelf ? (
                      <span className="text-xs text-mute">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => invite(user)}
                        disabled={invitingId === user.id}
                        className="btn-link text-xs uppercase tracking-[0.12em]"
                      >
                        {invitingId === user.id ? "Sending…" : "Send invite"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-mute">
                  No admin accounts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-mute">
        Sending an invite issues a new temporary password and signs that admin out of every device.
      </p>
    </div>
  );
}
