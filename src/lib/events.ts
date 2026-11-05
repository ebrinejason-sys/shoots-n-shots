import { z } from "zod";
import { query } from "./db";
import type { EventRow } from "./types";

const dateString = z
  .string()
  .trim()
  .min(1, "Pick a date and time")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Pick a valid date and time");

export const eventInputSchema = z.object({
  name: z.string().trim().min(2, "Give the event a name").max(120),
  description: z.string().trim().max(600).optional().default(""),
  venue: z.string().trim().min(1, "Where is it?").max(120),
  startsAt: dateString,
  endsAt: dateString.optional(),
  timezone: z.string().trim().min(1).max(60).optional().default("Africa/Kampala"),
  priceMinor: z.coerce.number().int().min(0, "Price cannot be negative").max(1_000_000_000),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a three-letter currency code"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(100_000),
  isActive: z.boolean().optional().default(true),
});

const eventPatchSchema = eventInputSchema.partial();

export type EventInput = z.infer<typeof eventInputSchema>;

export type SaveEventResult =
  | { kind: "ok"; event: EventRow }
  | { kind: "not_found" }
  | { kind: "capacity_below_sold"; sold: number };

export async function listAllEvents(): Promise<EventRow[]> {
  const result = await query<EventRow>(
    `SELECT * FROM events ORDER BY starts_at DESC`,
  );
  return result.rows;
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const result = await query<EventRow>(`SELECT * FROM events WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "event";
}

/**
 * Slugs are fixed at creation: tickets and QR codes point at event URLs, so
 * renaming an event must never move them.
 */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const existing = await query(`SELECT 1 FROM events WHERE slug = $1`, [candidate]);
    if (existing.rowCount === 0) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function resolvedEnds(startsAt: string, endsAt: string | undefined): string {
  if (endsAt) return new Date(endsAt).toISOString();
  return new Date(new Date(startsAt).getTime() + 4 * 60 * 60 * 1000).toISOString();
}

export async function createEvent(input: unknown): Promise<SaveEventResult> {
  const data = eventInputSchema.parse(input);
  const slug = await uniqueSlug(data.name);

  const result = await query<EventRow>(
    `INSERT INTO events
       (slug, name, description, venue, starts_at, ends_at, timezone,
        price_minor, currency, capacity, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      slug,
      data.name,
      data.description || null,
      data.venue,
      new Date(data.startsAt).toISOString(),
      resolvedEnds(data.startsAt, data.endsAt),
      data.timezone,
      data.priceMinor,
      data.currency,
      data.capacity,
      data.isActive,
    ],
  );

  return { kind: "ok", event: result.rows[0] };
}

export async function updateEvent(id: string, input: unknown): Promise<SaveEventResult> {
  const patch = eventPatchSchema.parse(input);
  const existing = await getEventById(id);
  if (!existing) return { kind: "not_found" };

  const merged = {
    name: patch.name ?? existing.name,
    description: patch.description ?? existing.description ?? "",
    venue: patch.venue ?? existing.venue,
    startsAt: patch.startsAt ?? new Date(existing.starts_at).toISOString(),
    endsAt: patch.endsAt ?? (existing.ends_at ? new Date(existing.ends_at).toISOString() : undefined),
    timezone: patch.timezone ?? existing.timezone,
    priceMinor: patch.priceMinor ?? existing.price_minor,
    currency: patch.currency ?? existing.currency.trim(),
    capacity: patch.capacity ?? existing.capacity,
    isActive: patch.isActive ?? existing.is_active,
  };
  const data = eventInputSchema.parse(merged);

  if (data.capacity < existing.sold) {
    return { kind: "capacity_below_sold", sold: existing.sold };
  }

  const result = await query<EventRow>(
    `UPDATE events SET
       name = $2, description = $3, venue = $4, starts_at = $5, ends_at = $6,
       timezone = $7, price_minor = $8, currency = $9, capacity = $10, is_active = $11
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.name,
      data.description || null,
      data.venue,
      data.startsAt,
      resolvedEnds(data.startsAt, data.endsAt),
      data.timezone,
      data.priceMinor,
      data.currency,
      data.capacity,
      data.isActive,
    ],
  );

  return { kind: "ok", event: result.rows[0] };
}
