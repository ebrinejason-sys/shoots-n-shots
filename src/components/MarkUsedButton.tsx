"use client";

import { useState } from "react";

interface Report {
  outcome: string;
  message: string;
}

export function MarkUsedButton({ token, disabled }: { token: string; disabled: boolean }) {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  async function markUsed() {
    setBusy(true);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: token }),
      });
      const data = (await response.json()) as Report & { error?: string };
      setReport({ outcome: data.outcome ?? "INVALID", message: data.message ?? data.error ?? "" });
    } catch {
      setReport({ outcome: "INVALID", message: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  if (report) {
    return (
      <p
        className={`rounded-xl border px-4 py-3 text-sm ${
          report.outcome === "VALID"
            ? "border-accent/50 bg-accent-soft text-ink"
            : "border-hot/50 bg-hot-soft text-ink"
        }`}
      >
        <span className="font-semibold">{report.outcome.replace("_", " ")}</span> — {report.message}
      </p>
    );
  }

  return (
    <button onClick={markUsed} disabled={busy || disabled} className="btn-primary w-full">
      {busy ? "Checking…" : "Mark this ticket as used"}
    </button>
  );
}
