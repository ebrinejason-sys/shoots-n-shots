import Link from "next/link";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { getStaffSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await getStaffSession();
  if (!session) redirect("/scanner/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Events</p>
          <h1 className="display mt-2 text-4xl leading-none text-ink">New event</h1>
          <p className="mt-2 text-sm text-mute">
            It goes live on the public site as soon as it is saved with On sale checked.
          </p>
        </div>
        <Link href="/admin/events" className="btn-link">
          ← Events
        </Link>
      </div>

      <EventForm mode="create" />
    </div>
  );
}
