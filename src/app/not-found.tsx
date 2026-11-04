import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-5 py-12 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-hot">404</p>
      <h1 className="display text-4xl leading-none text-ink">Nothing behind this door</h1>
      <p className="text-sm text-mute">
        The page, ticket link or event you followed no longer exists.
      </p>
      <Link href="/" className="btn-primary inline-block">
        Back to the party
      </Link>
    </div>
  );
}
