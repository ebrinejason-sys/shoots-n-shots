import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shots & Secrets — Tickets",
  description: "Book, pay and scan tickets for Shots & Secrets House Party.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="display flex items-baseline gap-1.5 text-sm">
              <span className="text-accent glow-blue">Shots</span>
              <span className="text-hot">&amp;</span>
              <span className="text-ink">Secrets</span>
            </Link>
            <nav className="flex items-center gap-5 text-xs font-medium uppercase tracking-[0.14em] text-mute">
              <Link href="/scanner" className="transition hover:text-ink">
                Scanner
              </Link>
              <Link href="/admin" className="transition hover:text-ink">
                Admin
              </Link>
            </nav>
          </div>
          <div className="hairline h-px w-full opacity-40" />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-mute/70">
          Prototype build · Payments run in mock mode unless Flutterwave keys are configured.
        </footer>
      </body>
    </html>
  );
}
