"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { majorToMinor, minorToMajor } from "@/lib/money";

const TIMEZONES = [
  "Africa/Kampala",
  "Africa/Nairobi",
  "Africa/Dar_es_Salaam",
  "Africa/Kigali",
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Johannesburg",
  "UTC",
];

export interface EventFormValues {
  id: string;
  name: string;
  description: string;
  venue: string;
  date: string;
  time: string;
  timezone: string;
  price: string;
  currency: string;
  capacity: string;
  isActive: boolean;
}

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${read("hour") === "24" ? "00" : read("hour")}:${read("minute")}`,
  };
}

export function eventToFormValues(event: {
  id: string;
  name: string;
  description: string | null;
  venue: string;
  starts_at: Date | string;
  timezone: string;
  price_minor: number;
  currency: string;
  capacity: number;
  is_active: boolean;
}): EventFormValues {
  const startsAt = new Date(event.starts_at);
  const split = partsIn(startsAt, event.timezone);
  return {
    id: event.id,
    name: event.name,
    description: event.description ?? "",
    venue: event.venue,
    date: split.date,
    time: split.time,
    timezone: event.timezone,
    price: String(minorToMajor(event.price_minor, event.currency)),
    currency: event.currency.trim(),
    capacity: String(event.capacity),
    isActive: event.is_active,
  };
}

function blankValues(currency = "UGX"): EventFormValues {
  return {
    id: "",
    name: "",
    description: "",
    venue: "",
    date: "",
    time: "20:00",
    timezone: "Africa/Kampala",
    price: "",
    currency,
    capacity: "100",
    isActive: true,
  };
}

/** Turns a wall-clock date/time in `timeZone` into a real instant. */
function wallClockToIso(date: string, time: string, timeZone: string): string {
  const naive = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(naive);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asZoned = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );
  return new Date(naive.getTime() - (asZoned - naive.getTime())).toISOString();
}

export function EventForm({
  initial,
  mode,
}: {
  initial?: EventFormValues;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(initial ?? blankValues());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      name: values.name,
      description: values.description,
      venue: values.venue,
      startsAt: wallClockToIso(values.date, values.time, values.timezone),
      timezone: values.timezone,
      priceMinor: majorToMinor(Number(values.price || 0), values.currency),
      currency: values.currency,
      capacity: Number(values.capacity),
      isActive: values.isActive,
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/events" : `/api/admin/events/${values.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save the event");
        setBusy(false);
        return;
      }
      router.push("/admin/events");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-surface p-6">
      <Field label="Event name">
        <input
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
          required
          minLength={2}
          maxLength={120}
          className="input"
          placeholder="Shots & Secrets — House Party"
        />
      </Field>

      <Field label="Short description">
        <textarea
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          maxLength={600}
          rows={3}
          className="input resize-none"
          placeholder="What happens on the night?"
        />
      </Field>

      <Field label="Venue">
        <input
          value={values.venue}
          onChange={(event) => set("venue", event.target.value)}
          required
          maxLength={120}
          className="input"
          placeholder="The Studio, Kololo"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <input
            type="date"
            value={values.date}
            onChange={(event) => set("date", event.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="Doors open">
          <input
            type="time"
            value={values.time}
            onChange={(event) => set("time", event.target.value)}
            required
            className="input"
          />
        </Field>
      </div>

      <Field label="Time zone">
        <select
          value={values.timezone}
          onChange={(event) => set("timezone", event.target.value)}
          className="input"
        >
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price">
          <input
            type="number"
            min={0}
            step="1"
            value={values.price}
            onChange={(event) => set("price", event.target.value)}
            required
            className="input"
            placeholder="30000"
          />
        </Field>
        <Field label="Currency">
          <input
            value={values.currency}
            onChange={(event) => set("currency", event.target.value.toUpperCase())}
            required
            maxLength={3}
            minLength={3}
            className="input uppercase"
            placeholder="UGX"
          />
        </Field>
        <Field label="Capacity">
          <input
            type="number"
            min={1}
            step="1"
            value={values.capacity}
            onChange={(event) => set("capacity", event.target.value)}
            required
            className="input"
          />
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(event) => set("isActive", event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#1F4B43]"
        />
        <span>
          <span className="block text-sm font-medium text-ink">On sale</span>
          <span className="block text-xs text-mute">
            Visible on the public site and at the gate. Uncheck to take it off sale.
          </span>
        </span>
      </label>

      {error ? (
        <p className="rounded-xl border border-hot/40 bg-hot-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Saving…" : mode === "create" ? "Create event" : "Save changes"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}
